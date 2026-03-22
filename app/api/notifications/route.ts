import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    // Fetch DB notifications for the current user, ordered by newest first
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, lu: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des notifications:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des notifications" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await req.json();

    // Mark a single notification as read
    if (body.id) {
      await prisma.notification.update({
        where: { id: body.id, userId },
        data: { lu: true },
      });
      return NextResponse.json({ success: true });
    }

    // Mark all as read
    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId, lu: false },
        data: { lu: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Erreur lors de la mise à jour des notifications:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour des notifications" }, { status: 500 });
  }
}
