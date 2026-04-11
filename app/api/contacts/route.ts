export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";

export async function GET(req: NextRequest) {
  try {
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
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des contacts:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des contacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    telephone: parsed.data.telephone || null,
    poste: parsed.data.poste || null,
    notes: parsed.data.notes || null,
    entrepriseId: parsed.data.entrepriseId || null,
  };

  try {
    const contact = await prisma.contact.create({ data });
    return NextResponse.json(contact, { status: 201 });
  } catch (err: unknown) {
    console.error("Contact creation error:", err);
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Un contact avec cet email existe deja." }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Erreur lors de la creation du contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
