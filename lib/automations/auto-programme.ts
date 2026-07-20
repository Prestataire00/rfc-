// Envoi automatique du programme de formation.
//   1. À la signature d'un devis  → sendProgrammeOnDevisSigned (au contact du devis)
//      Trigger : syncDevisOnSignature (lib/signatures/devis-sync.ts)
//   2. À l'inscription d'un stagiaire → sendProgrammeOnInscription (au stagiaire)
//      Trigger : POST /api/sessions/[id]/inscriptions (fire-and-forget)
//
// Dans les deux cas : génère le PDF programme (lib/pdf/programmePdf) avec le
// branding RFC et l'envoie en pièce jointe, puis log historique + notif admin.
// Skip silencieux si pas d'email destinataire ou formation introuvable.

import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { programmePdf } from "@/lib/pdf/programme";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { sendEmail, programmeFormationEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";

// Construit le PDF programme pour une formation donnée + un nom de fichier propre.
// Retourne null si la formation est introuvable (loggé par l'appelant).
async function buildProgrammePdf(
  formationId: string,
): Promise<{ buffer: Uint8Array; filename: string; formation: { titre: string; duree: number } } | null> {
  const formation = await prisma.formation.findUnique({ where: { id: formationId } });
  if (!formation) return null;

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
  const filename = `Programme-${formation.titre.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40)}.pdf`;
  return { buffer, filename, formation: { titre: formation.titre, duree: formation.duree } };
}

// ==================== 1. À la signature du devis (contact) ====================
// Idempotence : syncDevisOnSignature ne relance cette fonction qu'une fois
// (garde `statut === "signe"` en amont), donc pas de double envoi.
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

  // Idempotence : ne renvoie pas le programme si déjà envoyé pour ce devis
  // (le déclenchement intégré et une éventuelle règle d'automatisation
  // "signature du devis" ne doivent pas doubler l'envoi).
  const dejaEnvoye = await prisma.historiqueAction.findFirst({
    where: { action: "programme_envoye_auto", devisId: devis.id },
    select: { id: true },
  });
  if (dejaEnvoye) {
    logger.warn("auto-programme.already_sent_devis", { devisId });
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

  const built = await buildProgrammePdf(demande.formationId);
  if (!built) {
    logger.warn("auto-programme.formation_not_found", { devisId, formationId: demande.formationId });
    return;
  }

  const contact = devis.contact;
  const mail = programmeFormationEmail({
    destinataireNom: `${contact.prenom} ${contact.nom}`,
    entrepriseNom: devis.entreprise?.nom ?? null,
    formationTitre: built.formation.titre,
    duree: built.formation.duree,
  });

  try {
    const envoi = await sendEmail({
      to: contact.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [{ filename: built.filename, content: Buffer.from(built.buffer) }],
      log: { contactId: contact.id },
    });
    if (envoi.skipped) {
      logger.warn("auto-programme.email_skipped", { devisId });
      await notifyAdmins({
        titre: "Programme de formation non envoyé",
        message: `Devis ${devis.numero} signé — ${built.formation.titre}. Service mail non configuré ou destinataire refusé. Renvoyez manuellement.`,
        type: "warning",
        lien: `/commercial/devis/${devis.id}`,
      }).catch(() => {});
      return;
    }
    await logAction({
      action: "programme_envoye_auto",
      label: `Programme "${built.formation.titre}" envoyé auto à ${contact.email} (signature devis ${devis.numero})`,
      lien: `/commercial/devis/${devis.id}`,
      contactId: contact.id,
      entrepriseId: devis.entrepriseId ?? undefined,
      devisId: devis.id,
    }).catch(() => {});
    await notifyAdmins({
      titre: "Programme de formation envoyé",
      message: `Programme "${built.formation.titre}" envoyé à ${contact.prenom} ${contact.nom} (${contact.email}) — signature devis ${devis.numero}`,
      type: "success",
      lien: `/commercial/devis/${devis.id}`,
    }).catch(() => {});
  } catch (err) {
    logger.warn("auto-programme.send_failed", { devisId, error: String(err) });
  }
}

// ==================== 2. À l'inscription d'un stagiaire ====================
// Envoie le programme au stagiaire inscrit (même déclenchement que la convention).
// Skip silencieux si le contact n'a pas d'email.
export async function sendProgrammeOnInscription(inscriptionId: string): Promise<void> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      contact: { include: { entreprise: true } },
      session: { select: { id: true, formationId: true } },
    },
  });
  if (!inscription) {
    logger.warn("auto-programme.inscription_not_found", { inscriptionId });
    return;
  }
  if (!inscription.contact?.email) {
    logger.warn("auto-programme.inscription_no_contact_email", { inscriptionId });
    return;
  }

  const built = await buildProgrammePdf(inscription.session.formationId);
  if (!built) {
    logger.warn("auto-programme.inscription_formation_not_found", {
      inscriptionId,
      formationId: inscription.session.formationId,
    });
    return;
  }

  const contact = inscription.contact;
  const mail = programmeFormationEmail({
    destinataireNom: `${contact.prenom} ${contact.nom}`,
    entrepriseNom: contact.entreprise?.nom ?? null,
    formationTitre: built.formation.titre,
    duree: built.formation.duree,
  });

  try {
    const envoi = await sendEmail({
      to: contact.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [{ filename: built.filename, content: Buffer.from(built.buffer) }],
      log: { contactId: contact.id, sessionId: inscription.session.id },
    });
    if (envoi.skipped) {
      logger.warn("auto-programme.inscription_email_skipped", { inscriptionId });
      return;
    }
    await logAction({
      action: "programme_envoye_auto",
      label: `Programme "${built.formation.titre}" envoyé auto à ${contact.email} (inscription)`,
      lien: `/sessions/${inscription.session.id}`,
      contactId: contact.id,
      entrepriseId: contact.entreprise?.id ?? undefined,
      sessionId: inscription.session.id,
    }).catch(() => {});
  } catch (err) {
    logger.warn("auto-programme.inscription_send_failed", { inscriptionId, error: String(err) });
  }
}

// ==================== 3. Cible générique contact + session ====================
// Utilisé par le moteur d'automatisation V2 (cron) pour l'action
// "send_programme" sur les déclencheurs temporels (J-1, fin de session + délai…).
// Envoie le programme de la formation de la session au contact donné.
export async function sendProgrammeToContactSession(
  contactId: string,
  sessionId: string,
): Promise<{ ok: boolean; detail: string }> {
  const [contact, session] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: contactId },
      include: { entreprise: { select: { id: true, nom: true } } },
    }),
    prisma.session.findUnique({ where: { id: sessionId }, select: { formationId: true } }),
  ]);
  if (!contact?.email) return { ok: false, detail: "Contact sans email" };
  if (!session) return { ok: false, detail: "Session introuvable" };

  // Pas de dédup transverse ici : chaque règle d'automatisation gère sa propre
  // déduplication (AutomationExecutionV2 par règle), ce qui permet des rappels
  // distincts (J-1, 1 mois après…) sur le même stagiaire.
  const built = await buildProgrammePdf(session.formationId);
  if (!built) return { ok: false, detail: "Formation introuvable" };

  const mail = programmeFormationEmail({
    destinataireNom: `${contact.prenom} ${contact.nom}`,
    entrepriseNom: contact.entreprise?.nom ?? null,
    formationTitre: built.formation.titre,
    duree: built.formation.duree,
  });

  const envoi = await sendEmail({
    to: contact.email,
    subject: mail.subject,
    html: mail.html,
    attachments: [{ filename: built.filename, content: Buffer.from(built.buffer) }],
    log: { contactId: contact.id, sessionId },
  });
  if (envoi.skipped) return { ok: false, detail: "Email non envoyé (SMTP non configuré)" };

  await logAction({
    action: "programme_envoye_auto",
    label: `Programme "${built.formation.titre}" envoyé à ${contact.email} (automatisation)`,
    lien: `/sessions/${sessionId}`,
    contactId,
    entrepriseId: contact.entreprise?.id ?? undefined,
    sessionId,
  }).catch(() => {});

  return { ok: true, detail: `Programme envoyé à ${contact.email}` };
}
