export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const upsertSchema = z.object({
  champId: z.string().min(1),
  entiteId: z.string().min(1),
  valeur: z.string(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const entiteId = searchParams.get("entiteId");
  const champId = searchParams.get("champId");

  const where: Record<string, unknown> = {};
  if (entiteId) where.entiteId = entiteId;
  if (champId) where.champId = champId;

  const items = await prisma.valeurChampPersonnalise.findMany({
    where,
    include: { champ: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, upsertSchema);

  const existing = await prisma.valeurChampPersonnalise.findFirst({
    where: { champId: body.champId, entiteId: body.entiteId },
  });

  const item = existing
    ? await prisma.valeurChampPersonnalise.update({
        where: { id: existing.id },
        data: { valeur: body.valeur },
      })
    : await prisma.valeurChampPersonnalise.create({ data: body });

  return NextResponse.json(item, { status: existing ? 200 : 201 });
});
