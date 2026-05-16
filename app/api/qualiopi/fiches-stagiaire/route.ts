export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fichePreFormationStagiaireAdminSchema } from "@/lib/validations/fiche-pre-formation-stagiaire";
import { randomBytes } from "crypto";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const where = sessionId ? { sessionId } : {};
  const fiches = await prisma.fichePreFormationStagiaire.findMany({
    where,
    include: { contact: { select: { id: true, nom: true, prenom: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(fiches);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const data = await parseBody(req, fichePreFormationStagiaireAdminSchema);

  const existing = await prisma.fichePreFormationStagiaire.findUnique({
    where: { sessionId_contactId: { sessionId: data.sessionId, contactId: data.contactId } },
  });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const tokenAcces = randomBytes(24).toString("hex");
  const fiche = await prisma.fichePreFormationStagiaire.create({
    data: { ...data, tokenAcces },
  });
  return NextResponse.json(fiche, { status: 201 });
});
