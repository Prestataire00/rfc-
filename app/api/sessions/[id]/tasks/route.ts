export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { createTaskSchema } from "@/lib/pipeline/schemas";
import { isSessionStage } from "@/lib/pipeline/stages";

export const POST = withErrorHandlerParams(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });
    }

    const body = await parseBody(req, createTaskSchema);
    if (!isSessionStage(body.etape)) {
      return NextResponse.json({ error: "Étape inconnue" }, { status: 400 });
    }

    const sess = await prisma.session.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!sess) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    const task = await prisma.sessionTask.create({
      data: {
        sessionId: params.id,
        etape: body.etape,
        titre: body.titre,
        description: body.description ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assigneeId: body.assigneeId ?? null,
        source: "adhoc",
      },
    });
    return NextResponse.json(task, { status: 201 });
  },
);
