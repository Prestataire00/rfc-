export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-wrapper";

// POST /api/notifications/read-all — marque toutes les notifs comme lues
export const POST = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.user.id, lu: false },
    data: { lu: true },
  });

  return NextResponse.json({ ok: true });
});
