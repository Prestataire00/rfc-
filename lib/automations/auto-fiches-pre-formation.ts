// Phase 3 — Auto-envoi fiches pré-formation à la signature d'un devis
// Spec: docs/superpowers/specs/2026-05-16-auto-fiches-pre-formation-phase-3-design.md
//
// 2 fonctions exportées (idempotentes) :
//   - autoCreateSessionAndFicheEntrepriseOnDevisSigned : à la signature d'un devis
//   - autoCreateFicheStagiaireOnInscription : à l'ajout d'un stagiaire sur une session

import { prisma } from "@/lib/prisma";
import { sendEmail, fichePreFormationEntrepriseEmail, fichePreFormationStagiaireEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export type AutoResult<T> = T | { error: string; skipped?: boolean };

/**
 * À la signature électronique d'un devis : crée session brouillon + fiche entreprise + email.
 * Idempotent : si une session a déjà été créée auto pour ce devis (marker dans notes), skip.
 */
export async function autoCreateSessionAndFicheEntrepriseOnDevisSigned(
  devisId: string,
): Promise<AutoResult<{ sessionId: string; ficheEntrepriseId: string }>> {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: {
      entreprise: true,
      contact: true,
    },
  });
  if (!devis) return { error: "Devis introuvable: " + devisId };

  // Trouver la Demande liée (via Demande.devisId)
  const demande = await prisma.demande.findFirst({
    where: { devisId: devis.id },
  });
  if (!demande) {
    // Devis créé manuellement sans Demande — skip silencieux
    return { error: "Pas de Demande liée à ce devis", skipped: true };
  }

  if (!demande.formationId) {
    await notifyAdmins({
      titre: "Devis signé sans formation matchée",
      message: `${devis.entreprise?.nom ?? "Client"} a signé ${devis.numero} mais la Demande #${demande.id} n'a pas de formationId. Créez la session manuellement.`,
      type: "warning",
      lien: `/commercial/devis/${devis.id}`,
    }).catch((err) => logger.warn("phase-3.notif-no-formation-failed", { error: String(err) }));
    return { error: "Demande sans formationId — notif admin envoyée", skipped: true };
  }

  // Idempotence : check si une session avec marker "phase3:devis:X" dans ses notes existe déjà
  const sessionMarker = `phase3:devis:${devis.id}`;
  const existingSession = await prisma.session.findFirst({
    where: { notes: { contains: sessionMarker } },
    select: { id: true },
  });
  if (existingSession) {
    return { error: "Session déjà auto-créée pour ce devis: " + existingSession.id, skipped: true };
  }

  // Dates par défaut : J+30 (brouillon à compléter)
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() + 30);
  const dateFin = new Date(dateDebut);

  const tokenAcces = randomBytes(24).toString("hex");

  // Création session brouillon + fiche entreprise en transaction atomique
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        formationId: demande.formationId!,
        dateDebut,
        dateFin,
        lieu: null,
        capaciteMax: demande.nbStagiaires ?? 1,
        statut: "planifiee",
        notes: `[${sessionMarker}] Session brouillon créée auto à la signature du devis ${devis.numero}. À compléter (dates/lieu/formateur) + ajouter les stagiaires.`,
      },
      select: { id: true, dateDebut: true },
    });

    const fiche = await tx.fichePreFormationEntreprise.create({
      data: {
        sessionId: session.id,
        entrepriseId: devis.entrepriseId ?? null,
        tokenAcces,
        statut: "envoye",
        dateEnvoi: new Date(),
        destinataireNom: devis.contact ? `${devis.contact.prenom} ${devis.contact.nom}` : null,
        destinataireEmail: devis.contact?.email ?? null,
      },
      select: { id: true, tokenAcces: true },
    });

    return { sessionId: session.id, sessionDateDebut: session.dateDebut, ficheEntrepriseId: fiche.id, tokenAcces: fiche.tokenAcces };
  });

  // Email (hors transaction, fire-and-forget sur erreur)
  if (devis.contact?.email) {
    // Récupérer le titre de la formation pour l'email
    const formation = await prisma.demande.findFirst({
      where: { id: demande.id },
      include: { formation: { select: { titre: true } } },
    });
    const formationTitre = formation?.formation?.titre ?? "Formation";

    const mail = fichePreFormationEntrepriseEmail({
      destinataireNom: devis.contact ? `${devis.contact.prenom} ${devis.contact.nom}` : "",
      entreprise: { nom: devis.entreprise?.nom ?? "" },
      formation: { titre: formationTitre },
      session: { dateDebut: result.sessionDateDebut.toISOString() },
      link: `${BASE_URL}/qualiopi/fiche-entreprise/${result.tokenAcces}`,
    });
    await sendEmail({ to: devis.contact.email, subject: mail.subject, html: mail.html }).catch((err) =>
      logger.warn("phase-3.email-entreprise-failed", { error: String(err) }),
    );
  }

  // Notif admin succès
  await notifyAdmins({
    titre: "Devis signé — session brouillon créée",
    message: `Devis ${devis.numero} signé. Session brouillon + fiche entreprise envoyée. Complétez la session (dates/lieu/formateur) + ajoutez les stagiaires.`,
    type: "success",
    lien: `/sessions/${result.sessionId}`,
  }).catch((err) => logger.warn("phase-3.notif-success-failed", { error: String(err) }));

  return { sessionId: result.sessionId, ficheEntrepriseId: result.ficheEntrepriseId };
}

/**
 * À l'inscription d'un stagiaire sur une session : si la session est liée à un devis signé,
 * crée FichePreFormationStagiaire pour ce stagiaire + email.
 * Idempotent : si la fiche existe déjà pour ce (sessionId, contactId), skip.
 */
export async function autoCreateFicheStagiaireOnInscription(
  inscriptionId: string,
): Promise<AutoResult<{ ficheStagiaireId: string }>> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      session: {
        include: { formation: { select: { titre: true } } },
      },
      contact: true,
    },
  });
  if (!inscription) return { error: "Inscription introuvable: " + inscriptionId };
  if (!inscription.contact?.email) {
    return { error: "Contact sans email — pas d'envoi possible", skipped: true };
  }

  // Vérifier que la session est liée à un devis signé via Demande
  const demande = await prisma.demande.findFirst({
    where: {
      formationId: inscription.session.formationId,
      devisId: { not: null },
    },
    include: { devis: { select: { statut: true } } },
    orderBy: { updatedAt: "desc" },
  });
  if (!demande || demande.devis?.statut !== "signe") {
    return { error: "Session pas liée à un devis signé", skipped: true };
  }

  // Idempotence : fiche déjà existante pour ce (sessionId, contactId) ?
  const existing = await prisma.fichePreFormationStagiaire.findUnique({
    where: { sessionId_contactId: { sessionId: inscription.sessionId, contactId: inscription.contactId } },
    select: { id: true },
  });
  if (existing) {
    return { error: "Fiche stagiaire déjà existante: " + existing.id, skipped: true };
  }

  const tokenAcces = randomBytes(24).toString("hex");
  const fiche = await prisma.fichePreFormationStagiaire.create({
    data: {
      sessionId: inscription.sessionId,
      contactId: inscription.contactId,
      tokenAcces,
      statut: "envoye",
      dateEnvoi: new Date(),
    },
    select: { id: true, tokenAcces: true },
  });

  const mail = fichePreFormationStagiaireEmail({
    stagiaire: { prenom: inscription.contact.prenom, nom: inscription.contact.nom },
    formation: { titre: inscription.session.formation?.titre ?? "Formation" },
    session: { dateDebut: inscription.session.dateDebut.toISOString() },
    link: `${BASE_URL}/qualiopi/fiche-stagiaire/${fiche.tokenAcces}`,
  });
  await sendEmail({ to: inscription.contact.email, subject: mail.subject, html: mail.html }).catch((err) =>
    logger.warn("phase-3.email-stagiaire-failed", { error: String(err) }),
  );

  return { ficheStagiaireId: fiche.id };
}
