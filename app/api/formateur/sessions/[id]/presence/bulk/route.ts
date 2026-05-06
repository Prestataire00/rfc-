export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// POST /api/formateur/sessions/[id]/presence/bulk
// Marque tous les inscrits comme "present" pour un jour/creneau donne.
// Reserve au formateur assigne a la session.
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await getServerSession(authOptions);
  if (!auth?.user || auth.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formateurId = (auth.user as any).formateurId as string | null;
  if (!formateurId) return NextResponse.json({ error: "Formateur non lie" }, { status: 403 });

  const sess = await prisma.session.findUnique({ where: { id: params.id }, select: { formateurId: true } });
  if (!sess) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (sess.formateurId !== formateurId) {
    return NextResponse.json({ error: "Vous n'etes pas assigne a cette session" }, { status: 403 });
  }

  const { date, creneau } = await req.json();
  if (!date || !creneau) {
    return NextResponse.json({ error: "date et creneau requis" }, { status: 400 });
  }

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const isMatin = creneau === "matin";

  const inscriptions = await prisma.inscription.findMany({
    where: { sessionId: params.id, statut: { in: ["confirmee", "en_attente", "presente"] } },
    select: { contactId: true },
  });

  const results = await prisma.$transaction(async (tx) => {
    const out = [];
    for (const insc of inscriptions) {
      const r = await tx.feuillePresence.upsert({
        where: {
          sessionId_contactId_date: { sessionId: params.id, contactId: insc.contactId, date: dateObj },
        },
        update: isMatin
          ? { matin: true, statutMatin: "present" }
          : { apresMidi: true, statutApresMidi: "present" },
        create: {
          sessionId: params.id,
          contactId: insc.contactId,
          date: dateObj,
          matin: isMatin,
          apresMidi: !isMatin,
          ...(isMatin ? { statutMatin: "present" } : { statutApresMidi: "present" }),
        },
      });
      out.push(r);
    }
    return out;
  });

  return NextResponse.json({ count: results.length });
});
