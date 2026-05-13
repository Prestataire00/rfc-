// GET liste tous les commentaires d'une tâche (avec auteur).
// POST crée un commentaire — auteur = session.user.id (admin ou formateur).
// Permissions :
//   - Admin : full access
//   - Formateur : doit être assigné à la tâche (TaskItem.userId = son user.id)
//                 OU au projet de la liste (ProjetFormateur)
//   - Client : pas d'accès (V1)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { safeRichHtml } from "@/lib/sanitize-html";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  contentHtml: z.string().min(1, "Commentaire vide"),
});

async function canAccessTask(taskId: string, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  if (role !== "formateur") return false;

  const task = await prisma.taskItem.findUnique({
    where: { id: taskId },
    select: {
      userId: true,
      list: {
        select: {
          projetId: true,
        },
      },
    },
  });
  if (!task) return false;

  // Cas 1 : la tâche est assignée à ce user (User.id du formateur).
  if (task.userId === userId) return true;

  // Cas 2 : la tâche est sur un projet où le formateur est assigné.
  if (task.list.projetId) {
    // Récupère Formateur.id du user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { formateurId: true },
    });
    if (!user?.formateurId) return false;
    const pf = await prisma.projetFormateur.findUnique({
      where: {
        projetId_formateurId: { projetId: task.list.projetId, formateurId: user.formateurId },
      },
      select: { id: true },
    });
    if (pf) return true;
  }
  return false;
}

export const GET = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const allowed = await canAccessTask(ctx.params.id, session.user.id, session.user.role);
  if (!allowed) return NextResponse.json({ error: "Accès interdit" }, { status: 403 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId: ctx.params.id },
    include: {
      author: { select: { id: true, nom: true, prenom: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
});

export const POST = withErrorHandlerParams<{ id: string }>(async (req: NextRequest, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const allowed = await canAccessTask(ctx.params.id, session.user.id, session.user.role);
  if (!allowed) return NextResponse.json({ error: "Accès interdit" }, { status: 403 });

  const body = await parseBody(req, createSchema);

  let safe: string;
  try {
    safe = safeRichHtml(body.contentHtml);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Si après sanitization il ne reste plus rien (ex: que des balises strippées),
  // on rejette le commentaire vide.
  const plainText = safe.replace(/<[^>]+>/g, "").trim();
  if (!plainText) {
    return NextResponse.json({ error: "Commentaire vide après sanitization" }, { status: 400 });
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId: ctx.params.id,
      authorId: session.user.id,
      contentHtml: safe,
    },
    include: {
      author: { select: { id: true, nom: true, prenom: true, role: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
});
