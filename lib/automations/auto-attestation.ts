// Envoi automatique des attestations de fin de formation aux stagiaires
// présents. Deux entrées :
//   - sendAttestationToContact(sessionId, contactId) : envoi unitaire (manuel
//     depuis l'UI ou réutilisé en interne)
//   - sendAttestationsOnSessionTerminee(sessionId) : envoi en batch aux
//     stagiaires "presente" à la clôture de la session
//
// Le statut "presente" est l'indicateur fiable du fait que le stagiaire a
// suivi la formation (vs "annulee" ou "absente"). On enverra pas
// d'attestation à quelqu'un d'absent.
//
// Comportement :
//   - Crée le PDF attestation (réutilise lib/pdf/attestationPdf)
//   - Envoie par email avec PDF en pièce jointe
//   - Log historique "attestation_envoyee" / "attestation_envoyee_auto"
//   - Notif admin cloche (visibilité)
//   - Skip silencieux si contact sans email (warn loggé)

import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { attestationPdf } from "@/lib/pdf/templates";
import { getParametres, type EntrepriseParams } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { sendEmail, attestationEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Construit les données de l'attestation (mise en page fidèle au modèle RFC)
// à partir des enregistrements chargés. Réutilisé par l'envoi auto et les
// routes de téléchargement PDF pour garantir un rendu identique partout.
export function buildAttestationData(input: {
  contact: { nom: string; prenom: string; entreprise?: { nom: string; adresse?: string | null; codePostal?: string | null; ville?: string | null } | null };
  formation: { titre: string; duree: number; objectifs?: string | null; competencesAttestation?: string | null };
  session: { dateDebut: Date; dateFin: Date; lieu?: string | null };
  formateur?: { nom: string; prenom: string } | null;
  parametres: EntrepriseParams;
}): Parameters<typeof attestationPdf>[0] {
  const p = input.parametres;
  const dd = format(new Date(input.session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const df = format(new Date(input.session.dateFin), "dd/MM/yyyy", { locale: fr });
  const dateFormation = dd === df ? dd : `du ${dd} au ${df}`;

  const objectifs = (input.formation.objectifs || "")
    .split("\n")
    .map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean);

  let competences: { label: string; acquise: boolean }[] = [];
  try {
    const raw = JSON.parse(input.formation.competencesAttestation || "[]");
    if (Array.isArray(raw)) {
      competences = raw
        .map((c) => (typeof c === "string" ? c : c?.label))
        .filter((l): l is string => typeof l === "string" && l.trim().length > 0)
        .map((label) => ({ label, acquise: true }));
    }
  } catch { /* liste vide si JSON invalide */ }

  const ent = input.contact.entreprise;
  const entrepriseCliente = ent
    ? [ent.nom, ent.adresse, [ent.codePostal, ent.ville].filter(Boolean).join(" ")].filter(Boolean).join(" ")
    : undefined;

  const responsable = [p.representantPrenom, p.representantNom].filter(Boolean).join(" ").trim();
  const formateurNom = input.formateur
    ? `${input.formateur.prenom} ${input.formateur.nom}`
    : responsable || p.nomEntreprise;

  return {
    stagiaire: { nom: input.contact.nom, prenom: input.contact.prenom },
    organisme: {
      nom: p.nomEntreprise,
      responsable: responsable || undefined,
      adresse: p.adresse || undefined,
      codePostal: p.codePostal || undefined,
      ville: p.ville || undefined,
      telephone: p.telephone || undefined,
      email: p.email || undefined,
      siret: p.siret || undefined,
      nda: p.nda || undefined,
    },
    formateurNom,
    dateFormation,
    entrepriseCliente,
    lieuFormation: input.session.lieu || undefined,
    formation: {
      titre: input.formation.titre,
      dureeLabel: `${String(input.formation.duree).padStart(2, "0")} heures`,
      objectifs,
    },
    competences,
    villeSignature: p.ville || "",
    dateSignature: format(new Date(), "dd/MM/yyyy", { locale: fr }),
  };
}

export type AttestationResult =
  | { status: "sent"; destinataireEmail: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export async function sendAttestationToContact(
  sessionId: string,
  contactId: string,
  options?: { silent?: boolean }, // silent → pas de notif cloche (utilisé par le batch)
): Promise<AttestationResult> {
  const [session, contact, parametres] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { formation: true, formateur: true },
    }),
    prisma.contact.findUnique({ where: { id: contactId }, include: { entreprise: true } }),
    getParametres(),
  ]);

  if (!session || !contact) {
    return { status: "failed", error: "Session ou contact introuvable" };
  }
  if (!contact.email) {
    logger.warn("auto-attestation.no_email", { sessionId, contactId });
    return { status: "skipped", reason: "Pas d'email contact" };
  }

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });

  try {
    const branding = await resolveBranding(parametres);
    const template = await renderDocumentTemplate("attestation", {
      stagiaire: { prenom: contact.prenom, nom: contact.nom },
      formation: { titre: session.formation.titre, duree: session.formation.duree },
      session: { dateDebut, dateFin, lieu: session.lieu || "" },
      entreprise: {
        nomEntreprise: parametres.nomEntreprise,
        adresse: parametres.adresse,
        siret: parametres.siret,
        nda: parametres.nda,
      },
    });

    const docDef = attestationPdf(
      buildAttestationData({ contact, formation: session.formation, session, formateur: session.formateur, parametres }),
      { branding, template: template || undefined },
    );

    const buffer = await generatePdfBuffer(docDef);
    const mail = attestationEmail({
      stagiaireNom: `${contact.prenom} ${contact.nom}`,
      formationTitre: session.formation.titre,
      dateDebut,
      dateFin,
    });

    const envoi = await sendEmail({
      to: contact.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [
        {
          filename: `attestation-${contact.prenom}-${contact.nom}.pdf`,
          content: Buffer.from(buffer),
        },
      ],
      log: { contactId: contact.id, sessionId: session.id },
    });

    if (envoi.skipped) {
      if (!options?.silent) {
        await notifyAdmins({
          titre: "Attestation non envoyée",
          message: `${contact.prenom} ${contact.nom} — ${session.formation.titre}. Service mail non configuré.`,
          type: "warning",
          lien: `/sessions/${session.id}`,
        }).catch(() => {});
      }
      return { status: "skipped", reason: "SMTP non configuré ou destinataire refusé" };
    }

    await logAction({
      action: "attestation_envoyee",
      label: `Attestation envoyée à ${contact.email} (${session.formation.titre})`,
      lien: `/sessions/${session.id}`,
      contactId: contact.id,
      sessionId: session.id,
    }).catch(() => {});

    if (!options?.silent) {
      await notifyAdmins({
        titre: "Attestation envoyée",
        message: `${contact.prenom} ${contact.nom} (${contact.email}) — ${session.formation.titre}`,
        type: "success",
        lien: `/sessions/${session.id}`,
      }).catch(() => {});
    }

    return { status: "sent", destinataireEmail: contact.email };
  } catch (err) {
    logger.warn("auto-attestation.send_failed", {
      sessionId,
      contactId,
      error: String(err),
    });
    return { status: "failed", error: String(err) };
  }
}

// Envoi batch quand session.statut → "terminee". Cible : inscriptions "presente"
// (les "absente" et "annulee" sont skip). Une seule notif récap admin pour
// éviter la cloche-spam si beaucoup de stagiaires.
export async function sendAttestationsOnSessionTerminee(
  sessionId: string,
): Promise<{ sent: number; skipped: number; failed: number; total: number }> {
  const inscriptions = await prisma.inscription.findMany({
    where: { sessionId, statut: "presente" },
    include: { contact: { select: { id: true } } },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const insc of inscriptions) {
    const result = await sendAttestationToContact(sessionId, insc.contact.id, { silent: true });
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
      titre: "Attestations envoyées (clôture session)",
      message: `${titre} — ${sent}/${total} envoyée${total > 1 ? "s" : ""}${skipped > 0 ? ` · ${skipped} sans email` : ""}${failed > 0 ? ` · ${failed} échec${failed > 1 ? "s" : ""}` : ""}`,
      type: sent > 0 ? "success" : "warning",
      lien: `/sessions/${sessionId}`,
    }).catch(() => {});

    await logAction({
      action: "attestations_envoyees_auto",
      label: `${sent}/${total} attestations envoyées auto à la clôture de session`,
      lien: `/sessions/${sessionId}`,
      sessionId,
    }).catch(() => {});
  }

  return { sent, skipped, failed, total };
}
