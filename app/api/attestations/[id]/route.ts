export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();

  const attestation = await prisma.attestation.update({
    where: { id: params.id },
    data: {
      statut: body.statut,
      dateValidation: body.statut === "validee" ? new Date() : undefined,
    },
  });

  return NextResponse.json(attestation);
});
