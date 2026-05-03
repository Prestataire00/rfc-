export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const sessionId = searchParams.get("sessionId");
  const contactId = searchParams.get("contactId");
  const factureId = searchParams.get("factureId");
  const devisId = searchParams.get("devisId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (sessionId) where.sessionId = sessionId;
  if (contactId) where.contactId = contactId;
  if (factureId) where.factureId = factureId;
  if (devisId) where.devisId = devisId;

  const [data, total] = await Promise.all([
    prisma.generatedDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { template: { select: { id: true, nom: true } } },
    }),
    prisma.generatedDocument.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});
