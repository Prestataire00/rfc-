export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tags — liste tous les tags avec le nombre de contacts/entreprises
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { nom: "asc" },
      include: {
        _count: { select: { contacts: true, entreprises: true } },
      },
    });
    return NextResponse.json(tags);
  } catch (err) {
    console.error("GET tags:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST /api/tags — creer un tag
export async function POST(req: NextRequest) {
  try {
    const { nom, couleur } = await req.json();
    if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    const tag = await prisma.tag.create({ data: { nom, couleur: couleur || "#6b7280" } });
    return NextResponse.json(tag, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ce tag existe deja" }, { status: 409 });
    }
    console.error("POST tags:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// DELETE /api/tags?id=xxx — supprimer un tag
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE tags:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// PUT /api/tags — assigner/retirer un tag a un contact ou entreprise
// Body: { action: "add"|"remove", tagId, contactId?, entrepriseId? }
export async function PUT(req: NextRequest) {
  try {
    const { action, tagId, contactId, entrepriseId } = await req.json();
    if (!tagId || (!contactId && !entrepriseId)) {
      return NextResponse.json({ error: "tagId et contactId ou entrepriseId requis" }, { status: 400 });
    }

    if (action === "add") {
      if (contactId) {
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId, tagId } },
          create: { contactId, tagId },
          update: {},
        });
      }
      if (entrepriseId) {
        await prisma.entrepriseTag.upsert({
          where: { entrepriseId_tagId: { entrepriseId, tagId } },
          create: { entrepriseId, tagId },
          update: {},
        });
      }
    } else if (action === "remove") {
      if (contactId) {
        await prisma.contactTag.deleteMany({ where: { contactId, tagId } });
      }
      if (entrepriseId) {
        await prisma.entrepriseTag.deleteMany({ where: { entrepriseId, tagId } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT tags:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
