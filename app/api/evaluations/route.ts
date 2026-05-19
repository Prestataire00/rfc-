export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { withErrorHandler } from "@/lib/api-wrapper";

const evaluationCreateSchema = z.object({
  type: z.string().min(1, "type requis").max(60),
  cible: z.string().min(1, "cible requis").max(40),
  sessionId: z.string().min(1, "sessionId requis"),
  contactId: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const type = searchParams.get("type");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (sessionId) where.sessionId = sessionId;
  if (type) where.type = type;

  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      session: {
        include: {
          formation: { select: { titre: true } },
        },
      },
      contact: { select: { id: true, nom: true, prenom: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(evaluations);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = evaluationCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const token = randomBytes(32).toString("hex");

  const evaluation = await prisma.evaluation.create({
    data: {
      type: parsed.data.type,
      cible: parsed.data.cible,
      sessionId: parsed.data.sessionId,
      contactId: parsed.data.contactId || null,
      tokenAcces: token,
    },
  });

  return NextResponse.json(evaluation, { status: 201 });
});
