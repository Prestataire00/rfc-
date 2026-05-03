export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  sujet: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  participantUserIds: z.array(z.string()).min(1),
});

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: session.user.id } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, nom: true, prenom: true, email: true } } },
      },
      _count: { select: { messages: true } },
    },
    orderBy: [{ dernierMessageAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(conversations);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const body = await parseBody(req, createSchema);

  // Inclure le createur dans les participants si absent
  const userIds = Array.from(new Set([...body.participantUserIds, session.user.id]));

  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: {
        sujet: body.sujet ?? null,
        sessionId: body.sessionId ?? null,
      },
    });

    await tx.conversationParticipant.createMany({
      data: userIds.map((userId) => ({ conversationId: created.id, userId })),
    });

    return tx.conversation.findUnique({
      where: { id: created.id },
      include: {
        participants: {
          include: { user: { select: { id: true, nom: true, prenom: true, email: true } } },
        },
      },
    });
  });

  return NextResponse.json(conversation, { status: 201 });
});
