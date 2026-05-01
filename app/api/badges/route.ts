export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/badges — liste tous les badges
export const GET = withErrorHandler(async () => {
  const badges = await prisma.digitalBadge.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      formation: { select: { id: true, titre: true } },
      _count: { select: { awards: true } },
    },
  });
  return NextResponse.json(badges);
});

// POST /api/badges — creer un badge
export const POST = withErrorHandler(async (req: NextRequest) => {
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
});
