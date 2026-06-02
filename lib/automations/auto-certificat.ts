// Envoi automatique du certificat de réalisation aux financeurs/employeurs.
// Document Qualiopi obligatoire (art. L.6353-1 du Code du travail).
//
// Différence avec l'attestation de fin de formation :
//   - Attestation → va au STAGIAIRE, prouve qu'il a suivi la formation
//   - Certificat de réalisation → va au FINANCEUR (entreprise, OPCO,
//     France Travail), justifie la réalisation de l'action et déclenche
//     le paiement
//
// Destinataire (par ordre de préférence) :
//   1. Email entreprise du stagiaire (si rattaché à une entreprise)
//   2. Email du stagiaire (cas individuel, il a payé lui-même)
// Le PDF est toujours nominatif (un certificat par stagiaire).
//
// Comportement :
//   - Crée le PDF certificat (réutilise lib/pdf/certificatRealisationPdf)
//   - Envoie par email avec PDF en pièce jointe
//   - Log historique "certificat_realisation_envoye"
//   - Notif admin cloche
//   - Skip silencieux si aucun email disponible

import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { certificatRealisationPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { sendEmail, certificatRealisationEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type CertificatResult =
  | { status: "sent"; destinataireEmail: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export async function sendCertificatToContact(
  sessionId: string,
  contactId: string,
  options?: { silent?: boolean },
): Promise<CertificatResult> {
  const [session, contact, parametres] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { formation: true },
    }),
    prisma.contact.findUnique({
      where: { id: contactId },
      include: { entreprise: { select: { nom: true, email: true } } },
    }),
    getParametres(),
  ]);

  if (!session || !contact) {
    return { status: "failed", error: "Session ou contact introuvable" };
  }

  // Destinataire : entreprise.email > contact.email
  const destinataireEmail = contact.entreprise?.email || contact.email;
  if (!destinataireEmail) {
    logger.warn("auto-certificat.no_email", { sessionId, contactId });
    return { status: "skipped", reason: "Aucun email disponible (ni entreprise ni stagiaire)" };
  }

  // Données représentant : fallback intelligent si l'admin n'a pas rempli les
  // 3 champs dans /parametres. On utilise nomEntreprise comme nom + "Représentant
  // légal" comme qualité par défaut.
  const representantNom = parametres.representantNom
    || parametres.nomEntreprise.replace(/^RFC\s*-?\s*/i, "");
  const representantPrenom = parametres.representantPrenom || "";
  const representantQualite = parametres.representantQualite || "Représentant légal";

  const lieuSignature = parametres.ville || "—";
  const dateAction = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateSignature = format(new Date(), "dd/MM/yyyy", { locale: fr });

  try {
    const branding = await resolveBranding(parametres);
    const docDef = certificatRealisationPdf(
      {
        representant: {
          nom: representantNom,
          prenom: representantPrenom,
          qualite: representantQualite,
        },
        organisme: {
          nom: parametres.nomEntreprise,
          siret: parametres.siret || undefined,
          nda: parametres.nda || undefined,
        },
        stagiaire: { nom: contact.nom, prenom: contact.prenom },
        entrepriseSalarie: contact.entreprise
          ? { nom: contact.entreprise.nom }
          : undefined,
        formation: {
          titre: session.formation.titre,
          duree: session.formation.duree,
        },
        dateAction,
        natureAction: "formation",
        lieuSignature,
        dateSignature,
      },
      { branding },
    );

    const buffer = await generatePdfBuffer(docDef);
    const mail = certificatRealisationEmail({
      destinataireLabel: contact.entreprise?.nom || `${contact.prenom} ${contact.nom}`,
      stagiaireNom: `${contact.prenom} ${contact.nom}`,
      formationTitre: session.formation.titre,
      dateAction,
      duree: session.formation.duree,
    });

    const envoi = await sendEmail({
      to: destinataireEmail,
      subject: mail.subject,
      html: mail.html,
      attachments: [
        {
          filename: `certificat-realisation-${contact.prenom}-${contact.nom}.pdf`,
          content: Buffer.from(buffer),
        },
      ],
      log: { contactId: contact.id, sessionId: session.id },
    });

    if (envoi.skipped) {
      if (!options?.silent) {
        await notifyAdmins({
          titre: "Certificat de réalisation non envoyé",
          message: `${contact.prenom} ${contact.nom} — ${session.formation.titre}. Service mail non configuré.`,
          type: "warning",
          lien: `/sessions/${session.id}`,
        }).catch(() => {});
      }
      return { status: "skipped", reason: "SMTP non configuré ou destinataire refusé" };
    }

    await logAction({
      action: "certificat_realisation_envoye",
      label: `Certificat de réalisation envoyé à ${destinataireEmail} (${contact.prenom} ${contact.nom} — ${session.formation.titre})`,
      lien: `/sessions/${session.id}`,
      contactId: contact.id,
      entrepriseId: contact.entrepriseId ?? undefined,
      sessionId: session.id,
    }).catch(() => {});

    if (!options?.silent) {
      await notifyAdmins({
        titre: "Certificat de réalisation envoyé",
        message: `${contact.prenom} ${contact.nom} → ${destinataireEmail} (${session.formation.titre})`,
        type: "success",
        lien: `/sessions/${session.id}`,
      }).catch(() => {});
    }

    return { status: "sent", destinataireEmail };
  } catch (err) {
    logger.warn("auto-certificat.send_failed", {
      sessionId,
      contactId,
      error: String(err),
    });
    return { status: "failed", error: String(err) };
  }
}

// Envoi batch à la clôture de session — cible "presente" ET reussite=true.
// On ne certifie pas la réalisation pour :
//   - les absents (statut != "presente")
//   - ceux qui ont participé mais échoué (reussite=false)
//   - ceux qui n'ont pas encore été évalués (reussite=null) — admin doit
//     d'abord cocher réussite/échec sur la page session pour déclencher
//     l'envoi. Bouton manuel disponible si besoin de forcer.
export async function sendCertificatsOnSessionTerminee(
  sessionId: string,
): Promise<{ sent: number; skipped: number; failed: number; total: number }> {
  const inscriptions = await prisma.inscription.findMany({
    where: { sessionId, statut: "presente", reussite: true },
    include: { contact: { select: { id: true } } },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const insc of inscriptions) {
    const result = await sendCertificatToContact(sessionId, insc.contact.id, { silent: true });
    if (result.status === "sent") sent++;
    else if (result.status === "skipped") skipped++;
    else failed++;
  }

  const total = inscriptions.length;
  if (total > 0) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { formation: { select: { titre: true } } },
    });
    const titre = session?.formation.titre ?? "la session";
    await notifyAdmins({
      titre: "Certificats de réalisation envoyés (clôture)",
      message: `${titre} — ${sent}/${total} envoyé${sent > 1 ? "s" : ""}${skipped > 0 ? ` · ${skipped} sans email` : ""}${failed > 0 ? ` · ${failed} échec${failed > 1 ? "s" : ""}` : ""}`,
      type: sent > 0 ? "success" : "warning",
      lien: `/sessions/${sessionId}`,
    }).catch(() => {});

    await logAction({
      action: "certificats_realisation_envoyes_auto",
      label: `${sent}/${total} certificats de réalisation envoyés auto à la clôture`,
      lien: `/sessions/${sessionId}`,
      sessionId,
    }).catch(() => {});
  }

  return { sent, skipped, failed, total };
}
