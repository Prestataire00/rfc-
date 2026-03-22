export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "formateur") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.disponibilite.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE disponibilité:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de la disponibilité" }, { status: 500 });
  }
}
