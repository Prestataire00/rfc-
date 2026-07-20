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

// ==================== Convention CLIENT à la signature du devis ====================
// Envoie UNE convention au client (contact du devis / entreprise) à la signature.
// Distinct des conventions par stagiaire (sendConventionOnInscription).
// Idempotent par devisId (log historique "convention_entreprise_envoyee_auto").
export async function sendConventionEntrepriseOnDevisSigned(devisId: string): Promise<void> {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { entreprise: true, contact: true },
  });
  if (!devis) {
    logger.warn("auto-convention-entreprise.devis_not_found", { devisId });
    return;
  }
  if (!devis.contact?.email) {
    logger.warn("auto-convention-entreprise.no_contact_email", { devisId });
    return;
  }

  const deja = await prisma.historiqueAction.findFirst({
    where: { action: "convention_entreprise_envoyee_auto", devisId: devis.id },
    select: { id: true },
  });
  if (deja) {
    logger.warn("auto-convention-entreprise.already_sent", { devisId });
    return;
  }

  // Formation via la Demande liée. Session éventuelle (créée en phase 3) pour
  // les dates/lieu ; sinon "À définir" (convention préliminaire à la signature).
  const demande = await prisma.demande.findFirst({
    where: { devisId: devis.id, formationId: { not: null } },
    orderBy: { updatedAt: "desc" },
    include: { formation: true },
  });
  if (!demande?.formation) {
    logger.warn("auto-convention-entreprise.no_formation", { devisId });
    return;
  }
  const formation = demande.formation;

  const session = devis.entrepriseId
    ? await prisma.session.findFirst({
        where: { formationId: formation.id, notes: { contains: `phase3:devis:${devis.id}` } },
        orderBy: { createdAt: "desc" },
        select: { dateDebut: true, dateFin: true, lieu: true },
      })
    : null;

  const dateDebut = session ? format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr }) : "À définir";
  const dateFin = session ? format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr }) : "À définir";
  const lieu = session?.lieu || "À définir";

  const annee = format(new Date(), "yyyy");
  const numero = `CONV-${annee}-${devis.numero}`;
  const clientNom = devis.entreprise?.nom || (devis.contact ? `${devis.contact.prenom} ${devis.contact.nom}` : "Client");

  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);
  const template = await renderDocumentTemplate("convention", {
    formation: { titre: formation.titre, duree: formation.duree },
    session: { dateDebut, dateFin, lieu },
    entreprise: {
      nomEntreprise: parametres.nomEntreprise,
      adresse: parametres.adresse,
      siret: parametres.siret,
      nda: parametres.nda,
    },
  });

  const docDef = conventionPdf(
    {
      entreprise: {
        nom: clientNom,
        adresse: devis.entreprise?.adresse || undefined,
        ville: devis.entreprise?.ville || undefined,
        codePostal: devis.entreprise?.codePostal || undefined,
        siret: devis.entreprise?.siret || undefined,
      },
      formation: { titre: formation.titre, duree: formation.duree, objectifs: formation.objectifs || undefined },
      session: { dateDebut, dateFin, lieu },
      montantHT: devis.montantHT,
      montantTTC: devis.montantTTC,
      numero,
    },
    { branding, template: template || undefined },
  );

  const buffer = await generatePdfBuffer(docDef);
  const contact = devis.contact;
  const mail = conventionEmail({
    destinataireNom: `${contact.prenom} ${contact.nom}`,
    entrepriseNom: devis.entreprise?.nom || null,
    formationTitre: formation.titre,
    dateDebut,
    dateFin,
    lieu,
    numero,
  });

  try {
    const envoi = await sendEmail({
      to: contact.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [{ filename: `${numero}.pdf`, content: Buffer.from(buffer) }],
      log: { contactId: contact.id },
    });
    if (envoi.skipped) {
      logger.warn("auto-convention-entreprise.email_skipped", { devisId });
      return;
    }
    await logAction({
      action: "convention_entreprise_envoyee_auto",
      label: `Convention ${numero} envoyée au client ${clientNom} (signature devis ${devis.numero})`,
      lien: `/commercial/devis/${devis.id}`,
      contactId: contact.id,
      entrepriseId: devis.entrepriseId ?? undefined,
      devisId: devis.id,
    }).catch(() => {});
    await notifyAdmins({
      titre: "Convention client envoyée",
      message: `Convention ${numero} envoyée à ${clientNom} (${contact.email}) — signature devis ${devis.numero}`,
      type: "success",
      lien: `/commercial/devis/${devis.id}`,
    }).catch(() => {});
  } catch (err) {
    logger.warn("auto-convention-entreprise.send_failed", { devisId, error: String(err) });
  }
}

// ==================== Convention pour un contact + session (moteur cron) ====================
// Utilisé par l'action "send_convention" sur les déclencheurs temporels.
export async function sendConventionToContactSession(
  contactId: string,
  sessionId: string,
): Promise<{ ok: boolean; detail: string }> {
  const [contact, session] = await Promise.all([
    prisma.contact.findUnique({ where: { id: contactId }, include: { entreprise: true } }),
    prisma.session.findUnique({ where: { id: sessionId }, include: { formation: true } }),
  ]);
  if (!contact?.email) return { ok: false, detail: "Contact sans email" };
  if (!session) return { ok: false, detail: "Session introuvable" };

  const formation = session.formation;
  const entreprise = contact.entreprise;
  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });
  const annee = format(new Date(session.dateDebut), "yyyy");
  const numero = `CONV-${annee}-${session.id.slice(-4).toUpperCase()}${entreprise ? `-${entreprise.nom.slice(0, 4).toUpperCase()}` : "-IND"}`;
  const montantHT = formation.tarif;
  const montantTTC = montantHT * 1.2;
  const clientNom = entreprise?.nom || `${contact.prenom} ${contact.nom}`;

  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);
  const template = await renderDocumentTemplate("convention", {
    formation: { titre: formation.titre, duree: formation.duree },
    session: { dateDebut, dateFin, lieu: session.lieu || "" },
    entreprise: { nomEntreprise: parametres.nomEntreprise, adresse: parametres.adresse, siret: parametres.siret, nda: parametres.nda },
  });

  const docDef = conventionPdf(
    {
      entreprise: {
        nom: clientNom,
        adresse: entreprise?.adresse || undefined,
        ville: entreprise?.ville || undefined,
        codePostal: entreprise?.codePostal || undefined,
        siret: entreprise?.siret || undefined,
      },
      formation: { titre: formation.titre, duree: formation.duree, objectifs: formation.objectifs || undefined },
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

  const envoi = await sendEmail({
    to: contact.email,
    subject: mail.subject,
    html: mail.html,
    attachments: [{ filename: `${numero}.pdf`, content: Buffer.from(buffer) }],
    log: { contactId: contact.id, sessionId },
  });
  if (envoi.skipped) return { ok: false, detail: "Email non envoyé (SMTP non configuré)" };

  await logAction({
    action: "convention_envoyee_auto",
    label: `Convention ${numero} envoyée à ${contact.email} (automatisation)`,
    lien: `/sessions/${sessionId}`,
    contactId: contact.id,
    entrepriseId: entreprise?.id ?? undefined,
    sessionId,
  }).catch(() => {});

  return { ok: true, detail: `Convention envoyée à ${contact.email}` };
}
