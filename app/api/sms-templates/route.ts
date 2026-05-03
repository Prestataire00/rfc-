export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  description: z.string().optional().nullable(),
  contenu: z.string().min(1),
  variables: z.string().optional(),
  actif: z.boolean().optional(),
});

export const GET = withErrorHandler(async () => {
  const items = await prisma.smsTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.smsTemplate.create({ data: body });
  return NextResponse.json(item, { status: 201 });
});
