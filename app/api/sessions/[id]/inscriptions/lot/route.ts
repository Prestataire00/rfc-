export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

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

  // 2 requêtes au total (au lieu de 2N) : 1 findMany pour l'état avant,
  // 1 createMany pour insérer. skipDuplicates s'appuie sur @@unique([contactId, sessionId]).
  const dejaInscrits = await prisma.inscription.findMany({
    where: { sessionId: params.id, contactId: { in: contactIds } },
    select: { contactId: true },
  });
  const dejaInscritsSet = new Set(dejaInscrits.map((i) => i.contactId));
  const aCreer = contactIds.filter((id) => !dejaInscritsSet.has(id));

  const { count: enrolled } = await prisma.inscription.createMany({
    data: aCreer.map((contactId) => ({ sessionId: params.id, contactId, statut })),
    skipDuplicates: true,
  });

  // `enrolled` = vrai nombre inséré (createMany.count). Le statut par contact
  // est best-effort sur l'état avant : une insertion concurrente entre les
  // deux requêtes serait labellisée "enrolled" ici mais skippée par la base.
  const results = contactIds.map((contactId) => ({
    contactId,
    status: dejaInscritsSet.has(contactId)
      ? ("already_enrolled" as const)
      : ("enrolled" as const),
  }));
  const skipped = contactIds.length - enrolled;

  return NextResponse.json({ enrolled, skipped, errors: 0, total: contactIds.length, results });
});
