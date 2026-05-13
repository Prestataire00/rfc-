export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

/**
 * 3 modes de conversation (cf Conversation.type) :
 *
 *   direct_formateur : 1-1 admin ↔ formateur. Création réservée admin
 *                      (initie une discussion privée avec un formateur).
 *                      Peut aussi être créée par un formateur vers l'admin.
 *
 *   direct_client    : 1-1 admin ↔ client. Création réservée admin
 *                      (ou client → admin). Le « client » = un User
 *                      avec role=client (rattaché à une entreprise).
 *
 *   session_group    : groupe autour d'une session. Participants auto-
 *                      remplis : admin créateur + formateur assigné +
 *                      tous les User clients dont l'entreprise a un
 *                      Contact inscrit à la session. Création par
 *                      n'importe quel participant légitime.
 */

const createSchema = z.object({
  type: z.enum(["direct_formateur", "direct_client", "session_group"]),
  sujet: z.string().optional().nullable(),

  // Direct modes : un seul autre user (l'admin si on est formateur/client,
  // ou le formateur/client si on est admin)
  otherUserId: z.string().optional().nullable(),

  // Session mode : id de la session, participants déduits
  sessionId: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  // Filtre optionnel par type (UI peut afficher des onglets : direct / session)
  const typeFilter = new URL(req.url).searchParams.get("type");

  const where: Record<string, unknown> = {
    participants: { some: { userId: session.user.id } },
  };
  if (typeFilter) {
    where.type = typeFilter;
  }

  const conversations = await prisma.conversation.findMany({
    where: where as never,
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true, nom: true, prenom: true, email: true, role: true,
            },
          },
        },
      },
      session: {
        select: {
          id: true,
          dateDebut: true,
          dateFin: true,
          formation: { select: { titre: true } },
        },
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
  const me = session.user as { id: string; role: string };

  const participantUserIds = new Set<string>([me.id]);

  if (body.type === "session_group") {
    if (!body.sessionId) {
      return NextResponse.json(
        { error: "sessionId requis pour une conversation de session" },
        { status: 400 },
      );
    }
    const sessionData = await prisma.session.findUnique({
      where: { id: body.sessionId },
      include: {
        formateur: { include: { user: true } },
        inscriptions: {
          include: {
            contact: {
              include: {
                entreprise: { include: { users: true } },
              },
            },
          },
        },
      },
    });
    if (!sessionData) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    // Auto-fill participants pour le mode session
    // - formateur assigné (User lié au Formateur)
    if (sessionData.formateur?.user?.id) {
      participantUserIds.add(sessionData.formateur.user.id);
    }
    // - tous les Users clients des entreprises ayant un contact inscrit
    for (const ins of sessionData.inscriptions) {
      const entrUsers = ins.contact.entreprise?.users ?? [];
      for (const u of entrUsers) {
        if (u.role === "client") participantUserIds.add(u.id);
      }
    }

    // RBAC : si on est formateur, on doit être le formateur de la session.
    // Si on est client, on doit être dans la liste calculée.
    if (me.role === "formateur" && sessionData.formateur?.user?.id !== me.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas le formateur de cette session" },
        { status: 403 },
      );
    }
    if (me.role === "client" && !participantUserIds.has(me.id)) {
      return NextResponse.json(
        { error: "Vous n'êtes pas inscrit sur cette session" },
        { status: 403 },
      );
    }
    // Admin : autorisé toujours
  } else {
    // Modes direct : un autre user requis
    if (!body.otherUserId) {
      return NextResponse.json(
        { error: "otherUserId requis pour une conversation directe" },
        { status: 400 },
      );
    }
    if (body.otherUserId === me.id) {
      return NextResponse.json(
        { error: "Impossible de créer une conversation avec soi-même" },
        { status: 400 },
      );
    }

    const other = await prisma.user.findUnique({
      where: { id: body.otherUserId },
      select: { id: true, role: true, actif: true },
    });
    if (!other || !other.actif) {
      return NextResponse.json(
        { error: "Destinataire introuvable ou désactivé" },
        { status: 404 },
      );
    }

    // RBAC direct
    if (body.type === "direct_formateur") {
      const adminFormateur =
        (me.role === "admin" && other.role === "formateur") ||
        (me.role === "formateur" && other.role === "admin");
      if (!adminFormateur) {
        return NextResponse.json(
          { error: "Mode direct_formateur réservé admin ↔ formateur" },
          { status: 403 },
        );
      }
    } else if (body.type === "direct_client") {
      const adminClient =
        (me.role === "admin" && other.role === "client") ||
        (me.role === "client" && other.role === "admin");
      if (!adminClient) {
        return NextResponse.json(
          { error: "Mode direct_client réservé admin ↔ client" },
          { status: 403 },
        );
      }
    }

    participantUserIds.add(other.id);

    // Évite les doublons : si une conv directe existe déjà entre ces 2 users
    // (sans session), on la retourne au lieu d'en créer une nouvelle.
    const ids = Array.from(participantUserIds);
    const existing = await prisma.conversation.findFirst({
      where: {
        type: body.type,
        sessionId: null,
        AND: ids.map((id) => ({ participants: { some: { userId: id } } })),
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true, nom: true, prenom: true, email: true, role: true,
              },
            },
          },
        },
      },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }
  }

  const userIds = Array.from(participantUserIds);

  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: {
        type: body.type,
        sujet: body.sujet ?? null,
        sessionId: body.type === "session_group" ? body.sessionId ?? null : null,
      },
    });

    await tx.conversationParticipant.createMany({
      data: userIds.map((userId) => ({ conversationId: created.id, userId })),
    });

    return tx.conversation.findUnique({
      where: { id: created.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true, nom: true, prenom: true, email: true, role: true,
              },
            },
          },
        },
        session: {
          select: {
            id: true,
            dateDebut: true,
            dateFin: true,
            formation: { select: { titre: true } },
          },
        },
      },
    });
  });

  return NextResponse.json(conversation, { status: 201 });
});
