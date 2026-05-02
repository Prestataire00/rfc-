export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const DELETE = withErrorHandlerParams(async (
  _: NextRequest,
  { params }: { params: { id: string; inscriptionId: string } }
) => {
  await prisma.inscription.delete({ where: { id: params.inscriptionId } });
  return NextResponse.json({ success: true });
});
