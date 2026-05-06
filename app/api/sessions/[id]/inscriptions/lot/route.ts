export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { logger } from "@/lib/logger";

const lotSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1, "Au moins un contact requis"),
  statut: z.string().optional().default("confirmee"),
});

// POST /api/sessions/[id]/inscriptions/lot
// Inscription en masse : permet d'ajouter plusieurs contacts d'un coup a une session.
// Idempotent : un contact deja inscrit est skipped (status="already_enrolled"), pas une erreur.
// Verifie la capacite restante avant insertion. Pas de transaction (on veut succes partiel).
export const POST = withErrorHandlerParams(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { contactIds, statut } = await parseBody(req, lotSchema);

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { _count: { select: { inscriptions: true } }, formation: { select: { titre: true } } },
  });
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const capaciteRestante = session.capaciteMax - session._count.inscriptions;
  if (contactIds.length > capaciteRestante) {
    return NextResponse.json(
      { error: `Capacite insuffisante : ${capaciteRestante} place(s) restante(s) pour ${contactIds.length} contact(s) selectionne(s)` },
      { status: 409 }
    );
  }

  const results = await Promise.all(
    contactIds.map(async (contactId) => {
      const existing = await prisma.inscription.findFirst({
        where: { sessionId: params.id, contactId },
      });
      if (existing) return { contactId, status: "already_enrolled" as const };

      try {
        await prisma.inscription.create({
          data: { sessionId: params.id, contactId, statut },
        });
        return { contactId, status: "enrolled" as const };
      } catch (err) {
        logger.warn("inscription.lot_create_failed", { sessionId: params.id, contactId, error: String(err) });
        return { contactId, status: "error" as const };
      }
    })
  );

  const enrolled = results.filter((r) => r.status === "enrolled").length;
  const skipped = results.filter((r) => r.status === "already_enrolled").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ enrolled, skipped, errors, total: contactIds.length, results });
});
