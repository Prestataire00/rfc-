export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { patchTaskSchema } from "@/lib/pipeline/schemas";

export const PATCH = withErrorHandlerParams(
  async (req: NextRequest, { params }: { params: { taskId: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = session.user.role;
    const userId = session.user.id;

    const task = await prisma.sessionTask.findUnique({
      where: { id: params.taskId },
      select: { id: true, assigneeId: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const body = await parseBody(req, patchTaskSchema);

    if (role !== "admin") {
      // formateur : seulement toggle completed sur sa propre tâche
      if (role !== "formateur" || task.assigneeId !== userId) {
        return NextResponse.json({ error: "Réservé à l'assigné ou admin" }, { status: 403 });
      }
      const keys = Object.keys(body);
      const allowed = ["completed"];
      if (keys.some((k) => !allowed.includes(k))) {
        return NextResponse.json(
          { error: "Le formateur ne peut modifier que 'completed'" },
          { status: 403 },
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (body.completed !== undefined) {
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
    }
    if (role === "admin") {
      if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
      if (body.titre !== undefined) data.titre = body.titre;
      if (body.description !== undefined) data.description = body.description;
      if (body.dueDate !== undefined) {
        data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      }
      if (body.etape !== undefined) data.etape = body.etape;
    }

    const updated = await prisma.sessionTask.update({
      where: { id: params.taskId },
      data,
    });
    return NextResponse.json(updated);
  },
);

export const DELETE = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { taskId: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });
    }

    const task = await prisma.sessionTask.findUnique({
      where: { id: params.taskId },
      select: { source: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }
    if (task.source !== "adhoc") {
      return NextResponse.json(
        { error: "Tâche template non supprimable (cocher seulement)" },
        { status: 400 },
      );
    }

    await prisma.sessionTask.delete({ where: { id: params.taskId } });
    return NextResponse.json({ success: true });
  },
);
