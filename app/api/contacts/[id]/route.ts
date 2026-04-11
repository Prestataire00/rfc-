export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        entreprise: true,
        inscriptions: {
          include: {
            session: { include: { formation: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        devis: { orderBy: { createdAt: "desc" } },
        attestations: { orderBy: { createdAt: "desc" } },
        evaluations: { orderBy: { createdAt: "desc" } },
        besoins: {
          include: { formation: true },
          orderBy: { createdAt: "desc" },
        },
        feuillesPresence: {
          include: { session: { include: { formation: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contact) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(contact);
  } catch (err: unknown) {
    console.error("Erreur GET contact:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du contact" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(contact);
  } catch (err: unknown) {
    console.error("Erreur PUT contact:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du contact" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.contact.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE contact:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du contact" }, { status: 500 });
  }
}
