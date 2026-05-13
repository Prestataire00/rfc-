// GET /api/projets/[id]/documents : liste les documents du projet, groupés par type.
// POST : crée un document rattaché au projet avec son audience (visibleClient/visibleFormateur).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  type: z.string().min(1, "Type requis"),
  chemin: z.string().min(1, "Chemin requis (URL ou path)"),
  description: z.string().optional().nullable(),
  taille: z.number().int().nonnegative().optional().nullable(),
  visibleClient: z.boolean().optional(),
  visibleFormateur: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  return { session };
}

export const GET = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  const { error } = await requireAdmin();
  if (error) return error;

  const projet = await prisma.projet.findUnique({
    where: { id: ctx.params.id },
    select: { id: true, nom: true },
  });
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const docs = await prisma.document.findMany({
    where: { projetId: ctx.params.id },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  // Groupement par type pour faciliter le rendu UI organisé.
  const groupedByType = docs.reduce<Record<string, typeof docs>>((acc, d) => {
    const key = d.type || "autre";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  // Stats audience pour le résumé en tête.
  const stats = {
    total: docs.length,
    visibleClient: docs.filter((d) => d.visibleClient).length,
    visibleFormateur: docs.filter((d) => d.visibleFormateur).length,
    interneSeul: docs.filter((d) => !d.visibleClient && !d.visibleFormateur).length,
  };

  return NextResponse.json({ projet, documents: docs, groupedByType, stats });
});

export const POST = withErrorHandlerParams<{ id: string }>(async (req: NextRequest, ctx) => {
  const { error } = await requireAdmin();
  if (error) return error;

  const projet = await prisma.projet.findUnique({
    where: { id: ctx.params.id },
    select: { id: true, entrepriseId: true },
  });
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const body = await parseBody(req, createSchema);

  const doc = await prisma.document.create({
    data: {
      nom: body.nom.trim(),
      type: body.type,
      chemin: body.chemin,
      description: body.description ?? null,
      taille: body.taille ?? null,
      projetId: projet.id,
      // Rattachement entreprise répliqué depuis le projet pour que les filtres
      // de l'espace client (souvent par entrepriseId) trouvent le document.
      entrepriseId: projet.entrepriseId,
      visibleClient: body.visibleClient ?? false,
      visibleFormateur: body.visibleFormateur ?? false,
    },
  });

  return NextResponse.json(doc, { status: 201 });
});
