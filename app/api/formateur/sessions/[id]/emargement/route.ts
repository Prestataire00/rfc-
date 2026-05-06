export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { eachDayOfInterval, endOfDay } from "date-fns";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

async function assertFormateurOwnsSession(sessionId: string): Promise<NextResponse | string> {
  const auth = await getServerSession(authOptions);
  if (!auth?.user || auth.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formateurId = (auth.user as any).formateurId as string | null;
  if (!formateurId) return NextResponse.json({ error: "Formateur non lie" }, { status: 403 });

  const sess = await prisma.session.findUnique({ where: { id: sessionId }, select: { formateurId: true } });
  if (!sess) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (sess.formateurId !== formateurId) {
    return NextResponse.json({ error: "Vous n'etes pas assigne a cette session" }, { status: 403 });
  }
  return formateurId;
}

// GET /api/formateur/sessions/[id]/emargement
// Liste les tokens QR generaux pour la session (formateur assigne uniquement).
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const check = await assertFormateurOwnsSession(params.id);
  if (check instanceof NextResponse) return check;

  const tokens = await prisma.emargementToken.findMany({
    where: { sessionId: params.id, contactId: null },
    orderBy: [{ date: "asc" }, { creneau: "asc" }],
  });
  return NextResponse.json(tokens);
});

// POST /api/formateur/sessions/[id]/emargement
// Genere les tokens QR pour chaque jour/creneau (idempotent).
export const POST = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const check = await assertFormateurOwnsSession(params.id);
  if (check instanceof NextResponse) return check;

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { dateDebut: true, dateFin: true },
  });
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const days = eachDayOfInterval({
    start: new Date(session.dateDebut),
    end: new Date(session.dateFin),
  });

  const creneaux = ["matin", "apres_midi"] as const;
  const created: string[] = [];

  for (const day of days) {
    const dateObj = new Date(day.toISOString().split("T")[0] + "T00:00:00.000Z");
    for (const creneau of creneaux) {
      const existing = await prisma.emargementToken.findFirst({
        where: { sessionId: params.id, date: dateObj, creneau, contactId: null },
      });
      if (existing) continue;

      const token = randomBytes(24).toString("hex");
      await prisma.emargementToken.create({
        data: {
          sessionId: params.id,
          date: dateObj,
          creneau,
          token,
          expiresAt: endOfDay(day),
        },
      });
      created.push(`${dateObj.toISOString().split("T")[0]}-${creneau}`);
    }
  }

  const tokens = await prisma.emargementToken.findMany({
    where: { sessionId: params.id, contactId: null },
    orderBy: [{ date: "asc" }, { creneau: "asc" }],
  });

  return NextResponse.json({ created: created.length, tokens });
});
