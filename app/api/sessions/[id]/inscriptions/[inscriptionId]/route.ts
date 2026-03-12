import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; inscriptionId: string } }
) {
  await prisma.inscription.delete({ where: { id: params.inscriptionId } });
  return NextResponse.json({ success: true });
}
