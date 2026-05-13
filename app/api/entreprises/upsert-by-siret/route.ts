export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

/**
 * POST /api/entreprises/upsert-by-siret
 *
 * Crée une Entreprise dans Prisma OU retourne celle déjà existante (matchée
 * par SIRET unique). Utilisé par le formulaire `/contacts/nouveau` quand
 * l'utilisateur sélectionne une entreprise depuis l'API gouv : on a besoin
 * d'un `entrepriseId` Prisma pour lier le Contact.
 *
 * Idempotent : peut être appelé N fois avec les mêmes données, retourne
 * toujours la même Entreprise.
 */
const bodySchema = z.object({
  siret: z.string().min(14).max(14),
  nom: z.string().min(1).max(200),
  adresse: z.string().max(300).optional().nullable(),
  codePostal: z.string().max(10).optional().nullable(),
  ville: z.string().max(100).optional().nullable(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // SIRET est @unique sur Entreprise → on peut faire un upsert direct.
  const entreprise = await prisma.entreprise.upsert({
    where: { siret: data.siret },
    update: {
      // On met à jour uniquement les champs vides côté DB pour ne pas écraser
      // d'éventuelles données saisies manuellement par un admin. Si une
      // entreprise existe déjà, son nom prime.
      // (Si tu veux forcer la mise à jour, ajouter ici les overrides.)
    },
    create: {
      siret: data.siret,
      nom: data.nom,
      adresse: data.adresse ?? null,
      codePostal: data.codePostal ?? null,
      ville: data.ville ?? null,
    },
    select: {
      id: true,
      nom: true,
      siret: true,
    },
  });

  return NextResponse.json(entreprise);
});
