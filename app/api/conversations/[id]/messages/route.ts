export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  contenu: z.string().min(1),
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  // Audit 2026-05-19 §2.5 : vérifier que l'utilisateur est participant
  // à la conversation avant d'autoriser l'envoi (sinon IDOR : un user peut
  // poster dans n'importe quelle conversation en connaissant son id).
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId: params.id, userId: session.user.id },
    select: { id: true },
  });
  if (!participant) {
    return NextResponse.json({ error: "Non autorisé sur cette conversation" }, { status: 403 });
  }

  const body = await parseBody(req, createSchema);

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.conversationMessage.create({
      data: {
        conversationId: params.id,
        userId: session.user.id,
        contenu: body.contenu,
      },
    });

    await tx.conversation.update({
      where: { id: params.id },
      data: { dernierMessageAt: new Date() },
    });

    return message;
  });

  return NextResponse.json(result, { status: 201 });
});
