import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// Generate or retrieve inscription link for a session
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await prisma.session.findUnique({ where: { id: params.id } });

  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  let token = session.tokenInscription;
  if (!token) {
    token = randomBytes(16).toString("hex");
    await prisma.session.update({
      where: { id: params.id },
      data: { tokenInscription: token },
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return NextResponse.json({
    token,
    lien: `${baseUrl}/inscription-stagiaire/${token}`,
  });
}
