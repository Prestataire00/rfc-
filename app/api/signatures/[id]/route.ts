export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// Soft delete : on invalide la signature plutot que de la supprimer (audit)
export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.signatureDocument.update({
    where: { id: params.id },
    data: { valide: false },
  });
  return NextResponse.json({ ok: true, signature: item });
});
