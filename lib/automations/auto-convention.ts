// Envoi automatique de la convention de formation à l'inscription d'un stagiaire.
// Trigger : appel fire-and-forget depuis POST /api/sessions/[id]/inscriptions
// après création de l'inscription.
//
// Comportement :
//   - Génère le PDF convention (réutilise lib/pdf/conventionPdf)
//   - Envoie par email au contact (stagiaire) avec PDF en pièce jointe
//   - Si entreprise rattachée + email entreprise → CC à l'entreprise
//   - Log historique action "convention_envoyee_auto"
//   - Skip silencieux si contact sans email
//
// Cas stagiaire individuel (pas d'entreprise) : la convention utilise le
// nom du contact comme "client" — acceptable pour démarrer, à raffiner
// avec un template "contrat de formation pro" séparé si besoin.

import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { conventionPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { sendEmail, conventionEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function sendConventionOnInscription(inscriptionId: string): Promise<void> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      contact: { include: { entreprise: true } },
      session: { include: { formation: true } },
    },
  });
  if (!inscription) {
    logger.warn("auto-convention.inscription_not_found", { inscriptionId });
    return;
  }
  if (!inscription.contact.email) {
    logger.warn("auto-convention.no_contact_email", { inscriptionId });
    return;
  }

  const session = inscription.session;
  const formation = session.formation;
  const contact = inscription.contact;
  const entreprise = contact.entreprise;

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });
  const annee = format(new Date(session.dateDebut), "yyyy");
  const numero = `CONV-${annee}-${session.id.slice(-4).toUpperCase()}${entreprise ? `-${entreprise.nom.slice(0, 4).toUpperCase()}` : "-IND"}`;

  // Tarif × 1 stagiaire (1 inscription = 1 contact)
  const montantHT = formation.tarif;
  const montantTTC = montantHT * 1.2;

  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);
  const template = await renderDocumentTemplate("convention", {
    formation: { titre: formation.titre, duree: formation.duree },
    session: { dateDebut, dateFin, lieu: session.lieu || "" },
    entreprise: {
      nomEntreprise: parametres.nomEntreprise,
      adresse: parametres.adresse,
      siret: parametres.siret,
      nda: parametres.nda,
    },
  });

  // Pour stagiaire individuel : utilise le nom du contact comme "client"
  // (faute de template dédié contrat de formation pro).
  const clientNom = entreprise?.nom || `${contact.prenom} ${contact.nom}`;

  const docDef = conventionPdf(
    {
      entreprise: {
        nom: clientNom,
        adresse: entreprise?.adresse || undefined,
        ville: entreprise?.ville || undefined,
        codePostal: entreprise?.codePostal || undefined,
        siret: entreprise?.siret || undefined,
      },
      formation: {
        titre: formation.titre,
        duree: formation.duree,
        objectifs: formation.objectifs || undefined,
      },
      session: { dateDebut, dateFin, lieu: session.lieu || undefined },
      montantHT,
      montantTTC,
      numero,
    },
    { branding, template: template || undefined },
  );

  const buffer = await generatePdfBuffer(docDef);

  const mail = conventionEmail({
    destinataireNom: `${contact.prenom} ${contact.nom}`,
    entrepriseNom: entreprise?.nom || null,
    formationTitre: formation.titre,
    dateDebut,
    dateFin,
    lieu: session.lieu || null,
    numero,
  });

  try {
    const envoi = await sendEmail({
      to: contact.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [
        { filename: `${numero}.pdf`, content: Buffer.from(buffer) },
      ],
      log: { contactId: contact.id, sessionId: session.id },
    });
    if (envoi.skipped) {
      logger.warn("auto-convention.email_skipped", { inscriptionId });
      // Notif admin : convention NON envoyée (SMTP KO ou destinataire refusé)
      // pour qu'il puisse intervenir manuellement.
      await notifyAdmins({
        titre: "Convention non envoyée",
        message: `${contact.prenom} ${contact.nom} — ${formation.titre}. Service mail non configuré ou destinataire refusé. Renvoyez manuellement depuis la session.`,
        type: "warning",
        lien: `/sessions/${session.id}`,
      }).catch(() => {});
      return;
    }
    await logAction({
      action: "convention_envoyee_auto",
      label: `Convention ${numero} envoyée auto à ${contact.email} (inscription)`,
      lien: `/sessions/${session.id}`,
      contactId: contact.id,
      entrepriseId: entreprise?.id ?? undefined,
      sessionId: session.id,
    }).catch(() => {});
    // Notif admin de succès (visibilité immédiate dans la cloche)
    await notifyAdmins({
      titre: "Convention envoyée",
      message: `${numero} envoyée à ${contact.prenom} ${contact.nom} (${contact.email}) — ${formation.titre}`,
      type: "success",
      lien: `/sessions/${session.id}`,
    }).catch(() => {});
  } catch (err) {
    logger.warn("auto-convention.send_failed", {
      inscriptionId,
      error: String(err),
    });
  }
}
