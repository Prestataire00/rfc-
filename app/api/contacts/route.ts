import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const type = searchParams.get("type") ?? "";

    const contacts = await prisma.contact.findMany({
      where: {
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
      },
      include: { entreprise: { select: { id: true, nom: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts);
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
    return NextResponse.json({ error: "Erreur lors de la création du contact" }, { status: 500 });
  }
}
