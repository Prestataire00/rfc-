export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

const documentCreateSchema = z.object({
  nom: z.string().min(1, "nom requis").max(300),
  type: z.string().min(1, "type requis").max(60),
  chemin: z.string().max(500).optional().nullable(),
  taille: z.number().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  formateurId: z.string().optional().nullable(),
  entrepriseId: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const formateurId = searchParams.get("formateurId");
  const entrepriseId = searchParams.get("entrepriseId");
  const type = searchParams.get("type");

  const where: any = {};
  if (sessionId) where.sessionId = sessionId;
  if (formateurId) where.formateurId = formateurId;
  if (entrepriseId) where.entrepriseId = entrepriseId;
  if (type) where.type = type;

  const documents = await prisma.document.findMany({
    where,
    include: {
      session: { include: { formation: { select: { titre: true } } } },
      formateur: { select: { nom: true, prenom: true } },
      entreprise: { select: { nom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = documentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const document = await prisma.document.create({
    data: {
      nom: body.nom,
      type: body.type,
      chemin: body.chemin || `/documents/${Date.now()}-${body.nom}`,
      taille: body.taille || null,
      sessionId: body.sessionId || null,
      formateurId: body.formateurId || null,
      entrepriseId: body.entrepriseId || null,
    },
  });

  return NextResponse.json(document, { status: 201 });
});
