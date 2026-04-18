export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { eachDayOfInterval, endOfDay } from "date-fns";

// GET /api/sessions/[id]/emargement
// Retourne les tokens QR existants pour cette session (un par jour/creneau).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tokens = await prisma.emargementToken.findMany({
      where: { sessionId: params.id, contactId: null }, // QR generaux seulement
      orderBy: [{ date: "asc" }, { creneau: "asc" }],
    });
    return NextResponse.json(tokens);
  } catch (err) {
    console.error("GET emargement tokens:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST /api/sessions/[id]/emargement
// Genere les tokens QR pour chaque jour/creneau de la session.
// Idempotent : ne re-cree pas les tokens existants.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
        // Verifier si un token existe deja
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

    // Retourner tous les tokens
    const tokens = await prisma.emargementToken.findMany({
      where: { sessionId: params.id, contactId: null },
      orderBy: [{ date: "asc" }, { creneau: "asc" }],
    });

    return NextResponse.json({ created: created.length, tokens });
  } catch (err) {
    console.error("POST emargement tokens:", err);
    return NextResponse.json({ error: "Erreur generation tokens" }, { status: 500 });
  }
}
