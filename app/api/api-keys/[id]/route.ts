export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// Soft revoke
export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.apiKey.update({
    where: { id: params.id },
    data: { revokedAt: new Date() },
    select: { id: true, nom: true, prefix: true, revokedAt: true },
  });
  return NextResponse.json({ ok: true, apiKey: item });
});
