export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  couleur: z.string().optional(),
  description: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async () => {
  const items = await prisma.documentCategory.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.documentCategory.create({ data: body });
  return NextResponse.json(item, { status: 201 });
});
