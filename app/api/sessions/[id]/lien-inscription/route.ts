export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// Generate or retrieve inscription link for a session
export const POST = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
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

  const nextAuthUrl = process.env.NEXTAUTH_URL || "";
  const baseUrl = nextAuthUrl && !nextAuthUrl.includes("localhost")
    ? nextAuthUrl
    : `${_req.headers.get("x-forwarded-proto") || "https"}://${_req.headers.get("host")}`;
  return NextResponse.json({
    token,
    lien: `${baseUrl}/inscription-stagiaire/${token}`,
  });
});
