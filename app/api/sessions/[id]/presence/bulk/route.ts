export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/sessions/[id]/presence/bulk
// Marque tous les inscrits comme "present" pour un jour/creneau donne.
// Body: { date: "YYYY-MM-DD", creneau: "matin" | "apres_midi" }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { date, creneau } = await req.json();
    if (!date || !creneau) {
      return NextResponse.json({ error: "date et creneau requis" }, { status: 400 });
    }

    const dateObj = new Date(`${date}T00:00:00.000Z`);
    const isMatin = creneau === "matin";

    // Recuperer tous les inscrits confirmes/en_attente
    const inscriptions = await prisma.inscription.findMany({
      where: { sessionId: params.id, statut: { in: ["confirmee", "en_attente", "presente"] } },
      select: { contactId: true },
    });

    const results = await Promise.all(
      inscriptions.map((insc) =>
        prisma.feuillePresence.upsert({
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
        })
      )
    );

    return NextResponse.json({ count: results.length });
  } catch (err: unknown) {
    console.error("Erreur bulk presence:", err);
    return NextResponse.json({ error: "Erreur marquage en lot" }, { status: 500 });
  }
}
