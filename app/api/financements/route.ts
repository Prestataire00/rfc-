export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

const financementCreateSchema = z.object({
  type: z.string().min(1, "type requis").max(60),
  montant: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  entrepriseId: z.string().min(1, "entrepriseId requis"),
  organisme: z.string().max(200).optional().nullable(),
  reference: z.string().max(120).optional().nullable(),
  statut: z.string().max(60).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entrepriseId = searchParams.get("entrepriseId");

  const financements = await prisma.financement.findMany({
    where: entrepriseId ? { entrepriseId } : {},
    include: {
      entreprise: { select: { id: true, nom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(financements);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = financementCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { type, montant, organisme, reference, statut, notes, entrepriseId } = parsed.data;

  const financement = await prisma.financement.create({
    data: {
      type,
      montant: Number(montant),
      organisme: organisme || null,
      reference: reference || null,
      statut: statut || "en_cours",
      notes: notes || null,
      entrepriseId,
    },
  });

  await logAction({
    action: "financement_cree",
    label: `Financement ${type} créé — ${montant} €`,
    entrepriseId,
    userId: session.user.id,
  }).catch((err) => logger.warn("financement.historique_failed", { error: String(err) }));

  return NextResponse.json(financement, { status: 201 });
});
