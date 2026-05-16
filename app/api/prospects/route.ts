// Création unifiée d'un prospect — Phase 1.
// Reçoit un payload combiné (contact + entreprise + demande) et crée
// les 3 entités en transaction Prisma. Rollback automatique si erreur.
// Cf. docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { prospectCreationSchema } from "@/lib/validations/prospect";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

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

    const demande = await tx.demande.create({
      data: {
        titre: data.demande.formationSouhaitee,
        description: data.demande.formationSouhaitee,
        origine: data.demande.origine,
        sourceContact: data.demande.sourceContact || null,
        // Champs réels du modèle Demande (différents des noms du plan) :
        nbStagiaires: data.demande.nbStagiaires ?? null,   // plan: nbStagiairesSouhaite
        budget: data.demande.budgetEnvisage ?? null,        // plan: budgetEnvisage
        statut: "nouveau",
        contactId: contact.id,
        entrepriseId: entrepriseId || null,
        // Lier à une formation du catalogue si fourni
        formationId: data.demande.formationId || null,
        notes: notesParts.join("\n\n") || null,
      },
      select: { id: true },
    });

    return {
      demandeId: demande.id,
      contactId: contact.id,
      entrepriseId: entrepriseId ?? undefined,
    };
  });

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
    { ...result, redirectUrl: `/prospects/${result.demandeId}` },
    { status: 201 },
  );
});

