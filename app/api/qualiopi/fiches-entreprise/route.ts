export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fichePreFormationEntrepriseAdminSchema } from "@/lib/validations/fiche-pre-formation-entreprise";
import { randomBytes } from "crypto";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const where = sessionId ? { sessionId } : {};
  const fiches = await prisma.fichePreFormationEntreprise.findMany({
    where,
    include: { session: { select: { id: true, dateDebut: true, formation: { select: { titre: true } } } }, entreprise: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(fiches);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const data = await parseBody(req, fichePreFormationEntrepriseAdminSchema);
  const tokenAcces = randomBytes(24).toString("hex");
  const fiche = await prisma.fichePreFormationEntreprise.create({
    data: {
      ...data,
      destinataireEmail: data.destinataireEmail || null,
      tokenAcces,
    },
  });
  return NextResponse.json(fiche, { status: 201 });
});
