export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));

  const where = {
    AND: [
      search
        ? {
            OR: [
              { nom: { contains: search } },
              { prenom: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {},
      type ? { type } : {},
    ],
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { entreprise: { select: { id: true, nom: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({
    data: contacts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const parsed = await parseBody(req, contactSchema);

  const data = {
    ...parsed,
    telephone: parsed.telephone || null,
    poste: parsed.poste || null,
    notes: parsed.notes || null,
    entrepriseId: parsed.entrepriseId || null,
    dateNaissance: parsed.dateNaissance ? new Date(parsed.dateNaissance) : null,
  };

  const contact = await prisma.contact.create({ data });
  return NextResponse.json(contact, { status: 201 });
});
