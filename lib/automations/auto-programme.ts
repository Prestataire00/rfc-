// Envoi automatique du programme de formation à la signature d'un devis.
// Trigger : appel fire-and-forget depuis syncDevisOnSignature (lib/signatures/devis-sync.ts)
// après passage du devis au statut "signe".
//
// Comportement :
//   - Retrouve la formation via la Demande liée au devis (Demande.formationId)
//   - Génère le PDF programme (lib/pdf/programmePdf) avec le branding RFC
//   - Envoie par email au contact du devis avec le PDF en pièce jointe
//   - Log historique action "programme_envoye_auto" + notif admin
//   - Skip silencieux si : pas de contact/email, pas de Demande liée, ou pas de formationId
//
// Idempotence : syncDevisOnSignature ne relance cette fonction qu'une fois
// (garde `statut === "signe"` en amont), donc pas de double envoi.

import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { programmePdf } from "@/lib/pdf/programme";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { sendEmail, programmeFormationEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export async function sendProgrammeOnDevisSigned(devisId: string): Promise<void> {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { entreprise: true, contact: true },
  });
  if (!devis) {
    logger.warn("auto-programme.devis_not_found", { devisId });
    return;
  }
  if (!devis.contact?.email) {
    logger.warn("auto-programme.no_contact_email", { devisId });
    return;
  }

  // Formation liée : via la Demande rattachée au devis (Demande.formationId)
  const demande = await prisma.demande.findFirst({
    where: { devisId: devis.id, formationId: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { formationId: true },
  });
  if (!demande?.formationId) {
    // Devis sans formation matchée — l'auto-fiche notifie déjà l'admin, on skip.
    logger.warn("auto-programme.no_formation", { devisId });
    return;
  }

  const formation = await prisma.formation.findUnique({
    where: { id: demande.formationId },
  });
  if (!formation) {
    logger.warn("auto-programme.formation_not_found", { devisId, formationId: demande.formationId });
    return;
  }

  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);

  const docDef = programmePdf(
    {
      titre: formation.titre,
      duree: formation.duree,
      description: formation.description || undefined,
      publicCible: formation.publicCible || undefined,
      prerequis: formation.prerequis || undefined,
      objectifs: formation.objectifs || undefined,
      contenuProgramme: formation.contenuProgramme || undefined,
      methodesPedagogiques: formation.methodesPedagogiques || undefined,
      methodesEvaluation: formation.methodesEvaluation || undefined,
      moyensTechniques: formation.moyensTechniques || undefined,
      accessibilite: formation.accessibilite || undefined,
      indicateursResultats: formation.indicateursResultats || undefined,
      modalite: formation.modalite || undefined,
    },
    { branding },
  );

  const buffer = await generatePdfBuffer(docDef);

  const contact = devis.contact;
  const mail = programmeFormationEmail({
    destinataireNom: `${contact.prenom} ${contact.nom}`,
    entrepriseNom: devis.entreprise?.nom ?? null,
    formationTitre: formation.titre,
    duree: formation.duree,
  });

  const filename = `Programme-${formation.titre.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40)}.pdf`;

  try {
    const envoi = await sendEmail({
      to: contact.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [{ filename, content: Buffer.from(buffer) }],
      log: { contactId: contact.id },
    });
    if (envoi.skipped) {
      logger.warn("auto-programme.email_skipped", { devisId });
      await notifyAdmins({
        titre: "Programme de formation non envoyé",
        message: `Devis ${devis.numero} signé — ${formation.titre}. Service mail non configuré ou destinataire refusé. Renvoyez manuellement.`,
        type: "warning",
        lien: `/commercial/devis/${devis.id}`,
      }).catch(() => {});
      return;
    }
    await logAction({
      action: "programme_envoye_auto",
      label: `Programme "${formation.titre}" envoyé auto à ${contact.email} (signature devis ${devis.numero})`,
      lien: `/commercial/devis/${devis.id}`,
      contactId: contact.id,
      entrepriseId: devis.entrepriseId ?? undefined,
      devisId: devis.id,
    }).catch(() => {});
    await notifyAdmins({
      titre: "Programme de formation envoyé",
      message: `Programme "${formation.titre}" envoyé à ${contact.prenom} ${contact.nom} (${contact.email}) — signature devis ${devis.numero}`,
      type: "success",
      lien: `/commercial/devis/${devis.id}`,
    }).catch(() => {});
  } catch (err) {
    logger.warn("auto-programme.send_failed", { devisId, error: String(err) });
  }
}
