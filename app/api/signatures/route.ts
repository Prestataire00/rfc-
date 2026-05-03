export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  documentId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  signatureBase64: z.string().min(1),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  const contactId = searchParams.get("contactId");

  const where: Record<string, unknown> = {};
  if (documentId) where.documentId = documentId;
  if (contactId) where.contactId = contactId;

  const items = await prisma.signatureDocument.findMany({
    where,
    orderBy: { dateSignature: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.signatureDocument.create({ data: body });
  return NextResponse.json(item, { status: 201 });
});
