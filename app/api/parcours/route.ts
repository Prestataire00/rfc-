export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  description: z.string().optional().nullable(),
  duree: z.number().int().nonnegative(),
  tarif: z.number().nonnegative().optional().nullable(),
  actif: z.boolean().optional(),
  categorie: z.string().optional().nullable(),
  niveau: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const actif = searchParams.get("actif");
  const categorie = searchParams.get("categorie");

  const where: Record<string, unknown> = {};
  if (actif !== null) where.actif = actif === "true";
  if (categorie) where.categorie = categorie;

  const items = await prisma.parcours.findMany({
    where,
    include: { _count: { select: { modules: true, sessions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.parcours.create({ data: body });
  return NextResponse.json(item, { status: 201 });
});
