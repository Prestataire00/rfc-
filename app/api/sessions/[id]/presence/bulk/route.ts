export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const presenceBulkSchema = z.object({
  date: z.string().min(1, "date requise"),
  creneau: z.enum(["matin", "apres_midi"]),
});

// POST /api/sessions/[id]/presence/bulk
// Marque tous les inscrits comme "present" pour un jour/creneau donne.
// Body: { date: "YYYY-MM-DD", creneau: "matin" | "apres_midi" }
// Atomique : tous les upserts dans une seule transaction (un demi-emargement partiel est invalide).
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = presenceBulkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { date, creneau } = parsed.data;

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const isMatin = creneau === "matin";

  // Recuperer tous les inscrits confirmes/en_attente
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
