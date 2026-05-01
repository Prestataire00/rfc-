export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinClientAdminSchema } from "@/lib/validations/besoin-client";
import { randomBytes } from "crypto";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const where = sessionId ? { sessionId } : {};
  const fiches = await prisma.besoinClient.findMany({
    where,
    include: { session: { select: { id: true, dateDebut: true, formation: { select: { titre: true } } } }, entreprise: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(fiches);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const data = await parseBody(req, besoinClientAdminSchema);
  const tokenAcces = randomBytes(24).toString("hex");
  const fiche = await prisma.besoinClient.create({
    data: {
      ...data,
      destinataireEmail: data.destinataireEmail || null,
      tokenAcces,
    },
  });
  return NextResponse.json(fiche, { status: 201 });
});
