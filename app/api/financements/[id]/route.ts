export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

const financementUpdateSchema = z.object({
  type: z.string().min(1).max(60).optional(),
  montant: z.union([z.number(), z.string()]).optional(),
  organisme: z.string().max(200).optional().nullable(),
  reference: z.string().max(120).optional().nullable(),
  statut: z.string().max(60).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const financement = await prisma.financement.findUnique({
    where: { id: params.id },
    include: {
      entreprise: { select: { id: true, nom: true } },
    },
  });

  if (!financement) {
    return NextResponse.json({ error: "Financement non trouvé" }, { status: 404 });
  }

  return NextResponse.json(financement);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = financementUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { type, montant, organisme, reference, statut, notes } = parsed.data;

  const financement = await prisma.financement.update({
    where: { id: params.id },
    data: {
      ...(type !== undefined && { type }),
      ...(montant !== undefined && { montant: Number(montant) }),
      ...(organisme !== undefined && { organisme: organisme || null }),
      ...(reference !== undefined && { reference: reference || null }),
      ...(statut !== undefined && { statut }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  await logAction({
    action: "financement_modifie",
    label: `Financement ${financement.type} modifié`,
    entrepriseId: financement.entrepriseId ?? undefined,
    userId: session.user.id,
  }).catch((err) => logger.warn("financement.historique_failed", { error: String(err) }));

  return NextResponse.json(financement);
});

export const DELETE = withErrorHandlerParams(async (_: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const financement = await prisma.financement.findUnique({
    where: { id: params.id },
  });

  if (!financement) {
    return NextResponse.json({ error: "Financement non trouvé" }, { status: 404 });
  }

  await prisma.financement.delete({ where: { id: params.id } });

  await logAction({
    action: "financement_supprime",
    label: `Financement ${financement.type} supprimé`,
    entrepriseId: financement.entrepriseId ?? undefined,
    userId: session.user.id,
  }).catch((err) => logger.warn("financement.historique_failed", { error: String(err) }));

  return NextResponse.json({ success: true });
});
