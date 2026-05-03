export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  label: z.string().min(1),
  type: z.string().min(1),
  entiteCible: z.string().min(1),
  options: z.unknown().optional().nullable(),
  obligatoire: z.boolean().optional(),
  ordre: z.number().int().optional(),
  actif: z.boolean().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const entiteCible = searchParams.get("entiteCible");
  const actif = searchParams.get("actif");

  const where: Record<string, unknown> = {};
  if (entiteCible) where.entiteCible = entiteCible;
  if (actif !== null) where.actif = actif === "true";

  const items = await prisma.champPersonnalise.findMany({
    where,
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.champPersonnalise.create({
    data: {
      nom: body.nom,
      label: body.label,
      type: body.type,
      entiteCible: body.entiteCible,
      options: (body.options ?? null) as never,
      obligatoire: body.obligatoire ?? false,
      ordre: body.ordre ?? 0,
      actif: body.actif ?? true,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
