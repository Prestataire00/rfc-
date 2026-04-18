export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/badges/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const badge = await prisma.digitalBadge.findUnique({
      where: { id: params.id },
      include: {
        formation: { select: { id: true, titre: true } },
        awards: {
          where: { revoque: false },
          include: { contact: { select: { id: true, nom: true, prenom: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!badge) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(badge);
  } catch (err) {
    console.error("GET badges/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// PUT /api/badges/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const badge = await prisma.digitalBadge.update({
      where: { id: params.id },
      data: {
        nom: body.nom ?? undefined,
        description: body.description ?? undefined,
        icone: body.icone ?? undefined,
        niveau: body.niveau ?? undefined,
        couleur: body.couleur ?? undefined,
        formationId: body.formationId !== undefined ? (body.formationId || null) : undefined,
        actif: body.actif ?? undefined,
      },
    });
    return NextResponse.json(badge);
  } catch (err) {
    console.error("PUT badges/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// DELETE /api/badges/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.digitalBadge.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE badges/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
