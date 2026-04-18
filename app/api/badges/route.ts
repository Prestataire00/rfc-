export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/badges — liste tous les badges
export async function GET() {
  try {
    const badges = await prisma.digitalBadge.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        formation: { select: { id: true, titre: true } },
        _count: { select: { awards: true } },
      },
    });
    return NextResponse.json(badges);
  } catch (err) {
    console.error("GET badges:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST /api/badges — creer un badge
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const badge = await prisma.digitalBadge.create({
      data: {
        nom: body.nom,
        description: body.description || null,
        icone: body.icone || null,
        niveau: body.niveau || "bronze",
        couleur: body.couleur || "#dc2626",
        formationId: body.formationId || null,
        actif: body.actif ?? true,
      },
    });
    return NextResponse.json(badge, { status: 201 });
  } catch (err) {
    console.error("POST badges:", err);
    return NextResponse.json({ error: "Erreur creation" }, { status: 500 });
  }
}
