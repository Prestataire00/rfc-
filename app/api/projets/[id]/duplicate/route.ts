// POST /api/projets/[id]/duplicate
// Duplique un Projet : copie les champs métier (description, dates,
// budget, objectifs, livrables, chef projet, entreprise, formateurs)
// dans un nouveau Projet en statut "brouillon". Ne copie PAS les
// agrégats (demandes, devis, sessions, factures, taskLists, documents) —
// on duplique le cadre, pas l'exécution.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const original = await prisma.projet.findUnique({
      where: { id: params.id },
      include: { formateurs: { select: { formateurId: true, role: true, notes: true } } },
    });
    if (!original) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const copy = await prisma.projet.create({
      data: {
        nom: `${original.nom} (copie)`,
        description: original.description,
        // statut forcé : on repart d'un brouillon, à reconfigurer
        statut: "brouillon",
        priorite: original.priorite,
        dateDebut: null,
        dateFinPrevue: null,
        dateFinReelle: null,
        chefProjet: original.chefProjet,
        budget: original.budget,
        objectifs: original.objectifs,
        livrables: original.livrables,
        entrepriseId: original.entrepriseId,
        // Re-créer les jointures formateurs
        formateurs: {
          create: original.formateurs.map((pf) => ({
            formateurId: pf.formateurId,
            role: pf.role,
            notes: pf.notes,
          })),
        },
      },
      select: { id: true, nom: true },
    });

    return NextResponse.json(copy, { status: 201 });
  },
);
