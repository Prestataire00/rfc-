export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const attestationUpdateSchema = z.object({
  statut: z.string().min(1).max(40),
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = attestationUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const attestation = await prisma.attestation.update({
    where: { id: params.id },
    data: {
      statut: parsed.data.statut,
      dateValidation: parsed.data.statut === "validee" ? new Date() : undefined,
    },
  });

  return NextResponse.json(attestation);
});
