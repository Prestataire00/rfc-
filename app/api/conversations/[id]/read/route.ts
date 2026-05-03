export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const POST = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const updated = await prisma.conversationParticipant.updateMany({
    where: { conversationId: params.id, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Pas participant" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
});
