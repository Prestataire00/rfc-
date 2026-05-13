// DELETE un commentaire — auteur uniquement OU admin.
// PATCH peut être ajouté plus tard pour l'édition de commentaires existants.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const dynamic = "force-dynamic";

export const DELETE = withErrorHandlerParams<{ id: string; commentId: string }>(
  async (_req, ctx) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const comment = await prisma.taskComment.findUnique({
      where: { id: ctx.params.commentId },
      select: { id: true, taskId: true, authorId: true },
    });
    if (!comment || comment.taskId !== ctx.params.id) {
      return NextResponse.json({ error: "Commentaire introuvable" }, { status: 404 });
    }

    // Admin peut supprimer n'importe quel commentaire ; sinon il faut être l'auteur.
    if (session.user.role !== "admin" && comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    await prisma.taskComment.delete({ where: { id: ctx.params.commentId } });
    return NextResponse.json({ ok: true });
  },
);
