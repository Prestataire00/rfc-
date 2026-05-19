export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

const attestationCreateSchema = z.object({
  sessionId: z.string().min(1, "sessionId requis"),
  contactId: z.string().min(1, "contactId requis"),
  type: z.string().max(60).optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const contactId = searchParams.get("contactId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (sessionId) where.sessionId = sessionId;
  if (contactId) where.contactId = contactId;

  const attestations = await prisma.attestation.findMany({
    where,
    include: {
      session: { include: { formation: { select: { titre: true } } } },
      contact: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attestations);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = attestationCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const attestation = await prisma.attestation.create({
    data: {
      sessionId: parsed.data.sessionId,
      contactId: parsed.data.contactId,
      type: parsed.data.type || "fin_formation",
      statut: "generee",
    },
  });

  return NextResponse.json(attestation, { status: 201 });
});
