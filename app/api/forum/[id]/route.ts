export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/forum/[id] — detail du topic + replies
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const topic = await prisma.forumTopic.findUnique({
      where: { id: params.id },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });
    if (!topic) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(topic);
  } catch (err) {
    console.error("GET forum/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// PUT /api/forum/[id] — moderation (epingler, verrouiller, supprimer)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const topic = await prisma.forumTopic.update({
      where: { id: params.id },
      data: {
        epingle: body.epingle ?? undefined,
        verrouille: body.verrouille ?? undefined,
        titre: body.titre ?? undefined,
        contenu: body.contenu ?? undefined,
      },
    });
    return NextResponse.json(topic);
  } catch (err) {
    console.error("PUT forum/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// DELETE /api/forum/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.forumTopic.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE forum/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
