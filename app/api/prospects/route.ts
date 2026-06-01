// Création unifiée d'un prospect — Phase 1.
// Reçoit un payload combiné (contact + entreprise + demande) et crée
// les 3 entités en transaction Prisma. Rollback automatique si erreur.
// Cf. docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { prospectCreationSchema } from "@/lib/validations/prospect";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";
import { sendEmail, fichePreFormationEntrepriseEmail, fichePreFormationStagiaireEmail } from "@/lib/email";

export const POST = withErrorHandler(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = prospectCreationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // Vérif amont : email contact déjà existant → propose un rattachement
  const existing = await prisma.contact.findUnique({
    where: { email: data.contact.email },
    select: { id: true, nom: true, prenom: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: `Un contact avec cet email existe déjà (${existing.prenom} ${existing.nom}). Utilisez la création de demande depuis sa fiche contact pour le rattacher.`,
        existingContactId: existing.id,
      },
      { status: 409 },
    );
  }

  // Transaction : crée Entreprise (si nouvelle) → Contact → Demande
  // Noms de champs Demande adaptés depuis le schéma Prisma réel :
  //   nbStagiaires  (plan utilisait nbStagiairesSouhaite — non-existant)
  //   budget        (plan utilisait budgetEnvisage — non-existant)
  const result = await prisma.$transaction(async (tx) => {
    let entrepriseId: string | null = null;

    if (data.entrepriseMode === "nouvelle") {
      // Construire les notes secteur avec nature organisme si présent
      const secteurValue = data.entrepriseNouvelle?.secteur ||
        (data.entrepriseNouvelle?.natureOrganisme ? `Organisme : ${data.entrepriseNouvelle.natureOrganisme}` : null);
      const ent = await tx.entreprise.create({
        data: {
          nom: data.entrepriseNouvelle!.nom,
          siret: data.entrepriseNouvelle?.siret || null,
          adresse: data.entrepriseNouvelle?.adresse || null,
          codePostal: data.entrepriseNouvelle?.codePostal || null,
          ville: data.entrepriseNouvelle?.ville || null,
          secteur: secteurValue || null,
          effectif: data.entrepriseNouvelle?.effectif ?? null,
        },
        select: { id: true },
      });
      entrepriseId = ent.id;
    } else if (data.entrepriseMode === "existante") {
      entrepriseId = data.entrepriseId!;
    }
    // entrepriseMode === "aucune" → stagiaire individuel, pas d'entreprise

    // Déterminer le type Contact selon prospectType
    const contactType = data.prospectType === "stagiaire" ? "stagiaire" : "prospect";

    const contact = await tx.contact.create({
      data: {
        prenom: data.contact.prenom,
        nom: data.contact.nom,
        email: data.contact.email,
        telephone: data.contact.telephone || null,
        poste: data.contact.poste || null,
        type: contactType,
        entrepriseId: entrepriseId || null,
      },
      select: { id: true },
    });

    const notesParts: string[] = [];
    if (data.besoinsParticuliers?.handicapContraintes) {
      notesParts.push(`Handicap/contraintes : ${data.besoinsParticuliers.handicapContraintes}`);
    }
    if (data.besoinsParticuliers?.materielSurPlace) {
      notesParts.push(`Matériel sur place : ${data.besoinsParticuliers.materielSurPlace}`);
    }
    if (data.notesInternes) {
      notesParts.push(`Notes internes : ${data.notesInternes}`);
    }

    // Enrichir les notes avec le type de prospect si pertinent
    if (data.prospectType === "stagiaire") {
      notesParts.push("[Type: Stagiaire individuel]");
    } else if (data.prospectType === "organisme") {
      notesParts.push("[Type: Organisme / société tierce]");
      if (data.entrepriseNouvelle?.natureOrganisme) {
        notesParts.push(`Nature de l'organisme : ${data.entrepriseNouvelle.natureOrganisme}`);
      }
    }

    // Calcul nbStagiaires :
    //   - stagiaire individuel : forcé à 1 (lui-même)
    //   - entreprise : nb stagiaires nominaux si fournis, sinon compteur saisi
    //   - organisme : compteur saisi
    let nbStagiairesValue: number | null;
    if (data.prospectType === "stagiaire") {
      nbStagiairesValue = 1;
    } else if (data.prospectType === "entreprise" && data.stagiaires && data.stagiaires.length > 0) {
      nbStagiairesValue = data.stagiaires.length;
    } else {
      nbStagiairesValue = data.demande.nbStagiaires ?? null;
    }

    // Note : le concept Projet a été retiré (architecture cible 4 modules
    // Dashboard/Devis/Formation/BPF — sans Projet intermédiaire).
    // L'agrégat client est désormais porté par la chaîne Devis → Formation
    // → Session. Les colonnes projetId restent nullable en DB sans usage.
    const demande = await tx.demande.create({
      data: {
        titre: data.demande.formationSouhaitee,
        description: data.demande.formationSouhaitee,
        origine: data.demande.origine,
        sourceContact: data.demande.sourceContact || null,
        nbStagiaires: nbStagiairesValue,
        budget: data.demande.budgetEnvisage ?? null,
        statut: "nouveau",
        contactId: contact.id,
        entrepriseId: entrepriseId || null,
        formationId: data.demande.formationId || null,
        notes: notesParts.join("\n\n") || null,
      },
      select: { id: true },
    });

    // Création des stagiaires nominaux (uniquement pour prospectType=entreprise
    // avec une entreprise rattachée). Skip silencieusement les doublons par
    // email (un stagiaire peut déjà exister en DB).
    let stagiairesCrees = 0;
    if (
      data.prospectType === "entreprise" &&
      entrepriseId &&
      data.stagiaires &&
      data.stagiaires.length > 0
    ) {
      for (const s of data.stagiaires) {
        const emailNorm = s.email ? s.email.trim().toLowerCase() : null;
        // Skip si email déjà utilisé (évite collision sur unique constraint)
        if (emailNorm) {
          const exists = await tx.contact.findUnique({
            where: { email: emailNorm },
            select: { id: true },
          });
          if (exists) continue;
        }
        await tx.contact.create({
          data: {
            prenom: s.prenom,
            nom: s.nom,
            email: emailNorm || `stagiaire-${demande.id}-${stagiairesCrees}@placeholder.local`,
            telephone: s.telephone || null,
            type: "stagiaire",
            entrepriseId,
          },
        });
        stagiairesCrees++;
      }
    }

    return {
      demandeId: demande.id,
      contactId: contact.id,
      entrepriseId: entrepriseId ?? undefined,
      stagiairesCrees,
    };
  });

  // Création + envoi de la fiche pré-formation HORS transaction.
  // Décision (2026-06-01) : une erreur ici (mail Resend KO, colonne DB,
  // etc.) ne doit PAS rollback le prospect. Le prospect est sacro-saint.
  // L'admin pourra renvoyer la fiche manuellement depuis /prospects/[id].
  //
  // Routage :
  //   - prospectType "entreprise" / "organisme" → FichePreFormationEntreprise
  //   - prospectType "stagiaire" → FichePreFormationStagiaire (questionnaire
  //     individuel : prérequis, RQTH, données légales BPF/Passeport Prévention)
  let ficheEnvoyee = false;
  let ficheId: string | null = null;
  let ficheType: "entreprise" | "stagiaire" | null = null;
  if (data.contact.email) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const formation = data.demande.formationId
      ? await prisma.formation.findUnique({
          where: { id: data.demande.formationId },
          select: { id: true, titre: true },
        }).catch(() => null)
      : null;
    const titre = formation?.titre || data.demande.formationSouhaitee || "votre formation";

    if (data.prospectType === "stagiaire") {
      try {
        const fiche = await prisma.fichePreFormationStagiaire.create({
          data: {
            demandeId: result.demandeId,
            formationId: data.demande.formationId || null,
            contactId: result.contactId,
            tokenAcces: randomBytes(24).toString("hex"),
            statut: "en_attente",
          },
        });
        ficheId = fiche.id;
        ficheType = "stagiaire";

        const mail = fichePreFormationStagiaireEmail({
          stagiaire: { prenom: data.contact.prenom, nom: data.contact.nom },
          formation: { titre },
          session: null,
          link: `${baseUrl}/qualiopi/fiche-stagiaire/${fiche.tokenAcces}`,
        });
        const envoi = await sendEmail({
          to: data.contact.email,
          subject: mail.subject,
          html: mail.html,
        });
        if (!envoi.skipped) {
          await prisma.fichePreFormationStagiaire.update({
            where: { id: fiche.id },
            data: { statut: "envoye", dateEnvoi: new Date() },
          });
          ficheEnvoyee = true;
          await logAction({
            action: "fiche_pre_formation_envoyee",
            label: `Fiche stagiaire envoyée auto à ${data.contact.email}`,
            lien: `/prospects/${result.demandeId}`,
            contactId: result.contactId,
          }).catch(() => {});
        } else {
          logger.warn("prospect.fiche_stagiaire_email_skipped", {
            demandeId: result.demandeId,
          });
        }
      } catch (ficheErr) {
        logger.warn("prospect.fiche_stagiaire_creation_failed", {
          demandeId: result.demandeId,
          error: String(ficheErr),
        });
      }
    } else {
      // Cas entreprise / organisme : fiche entreprise
      try {
        const entrepriseDetails = result.entrepriseId
          ? await prisma.entreprise.findUnique({
              where: { id: result.entrepriseId },
              select: { secteur: true, effectif: true, nom: true },
            })
          : null;

        const fiche = await prisma.fichePreFormationEntreprise.create({
          data: {
            demandeId: result.demandeId,
            entrepriseId: result.entrepriseId ?? null,
            formationId: data.demande.formationId || null,
            tokenAcces: randomBytes(24).toString("hex"),
            statut: "en_attente",
            destinataireNom: `${data.contact.prenom} ${data.contact.nom}`,
            destinataireEmail: data.contact.email,
            secteurActivite: entrepriseDetails?.secteur ?? null,
            effectifTotal: entrepriseDetails?.effectif ?? null,
          },
        });
        ficheId = fiche.id;
        ficheType = "entreprise";

        const mail = fichePreFormationEntrepriseEmail({
          destinataireNom: `${data.contact.prenom} ${data.contact.nom}`,
          entreprise: { nom: entrepriseDetails?.nom || data.entrepriseNouvelle?.nom || "" },
          formation: { titre },
          session: null,
          link: `${baseUrl}/qualiopi/fiche-entreprise/${fiche.tokenAcces}`,
        });
        const envoi = await sendEmail({
          to: data.contact.email,
          subject: mail.subject,
          html: mail.html,
        });
        if (!envoi.skipped) {
          await prisma.fichePreFormationEntreprise.update({
            where: { id: fiche.id },
            data: { statut: "envoye", dateEnvoi: new Date() },
          });
          ficheEnvoyee = true;
          await logAction({
            action: "fiche_pre_formation_envoyee",
            label: `Fiche pré-formation envoyée auto à ${data.contact.email}`,
            lien: `/prospects/${result.demandeId}`,
            contactId: result.contactId,
            entrepriseId: result.entrepriseId,
          }).catch(() => {});
        } else {
          logger.warn("prospect.fiche_email_skipped", {
            demandeId: result.demandeId,
            reason: "Resend not configured or recipient rejected",
          });
        }
      } catch (ficheErr) {
        logger.warn("prospect.fiche_creation_failed", {
          demandeId: result.demandeId,
          error: String(ficheErr),
        });
      }
    }
  }

  try {
    await logAction({
      action: "prospect_cree",
      label: `Prospect créé : ${data.contact.prenom} ${data.contact.nom}`,
      lien: `/prospects/${result.demandeId}`,
      entrepriseId: result.entrepriseId,
      contactId: result.contactId,
    });
  } catch (logErr) {
    logger.warn("historique.prospect_cree_failed", { error: String(logErr) });
  }

  return NextResponse.json(
    { ...result, ficheEnvoyee, ficheId, ficheType, redirectUrl: `/prospects/${result.demandeId}` },
    { status: 201 },
  );
});

