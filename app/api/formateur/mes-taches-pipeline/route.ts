export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [sessionTasks, prospectTasks] = await Promise.all([
    prisma.sessionTask.findMany({
      where: { assigneeId: userId },
      include: {
        session: {
          select: {
            id: true,
            dateDebut: true,
            dateFin: true,
            formation: { select: { id: true, titre: true } },
          },
        },
      },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.prospectTask.findMany({
      where: { assigneeId: userId },
      include: {
        prospect: {
          select: { id: true, nom: true, prenom: true, entreprise: true },
        },
      },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  return NextResponse.json({ sessionTasks, prospectTasks });
});
