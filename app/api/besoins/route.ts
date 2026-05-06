export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import { besoinFormationSchema } from "@/lib/validations/besoin-formation";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (statut) where.statut = statut;

  const besoins = await prisma.besoinFormation.findMany({
    where,
    include: {
      entreprise: { select: { id: true, nom: true } },
      contact: { select: { id: true, prenom: true, nom: true } },
      formation: { select: { id: true, titre: true } },
      devis: { select: { id: true, numero: true, statut: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(besoins);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Pre-clean : convert "" -> null on optional fields before zod parse.
  const raw = await req.json();
  const cleaned = { ...raw };
  for (const key of ["nbStagiaires", "budget", "entrepriseId", "contactId", "formationId", "description", "datesSouhaitees", "notes", "sourceContact", "observation"]) {
    if (cleaned[key] === "") cleaned[key] = null;
  }
  const data = besoinFormationSchema.parse(cleaned);

  const besoin = await prisma.besoinFormation.create({
    data: {
      titre: data.titre,
      description: data.description || null,
      origine: data.origine,
      statut: data.statut,
      priorite: data.priorite,
      nbStagiaires: data.nbStagiaires || null,
      datesSouhaitees: data.datesSouhaitees || null,
      budget: data.budget || null,
      notes: data.notes || null,
      entrepriseId: data.entrepriseId || null,
      contactId: data.contactId || null,
      formationId: data.formationId || null,
      sourceContact: data.sourceContact || null,
      materielSurPlace: data.materielSurPlace ?? "[]",
      observation: data.observation || null,
    },
    include: {
      entreprise: { select: { nom: true } },
      contact: { select: { prenom: true, nom: true } },
    },
  });

  // Fire-and-forget : automations + notifications (hors tx, side-effects volontairement non-rollback).
  triggerAutomation("besoin_created", {
    besoinId: besoin.id,
    entrepriseId: besoin.entrepriseId ?? undefined,
    contactId: besoin.contactId ?? undefined,
    formationId: besoin.formationId ?? undefined,
  }).catch((err) => logger.warn("automation.besoin_created_failed", { error: String(err) }));

  const origineName = besoin.entreprise?.nom
    || (besoin.contact ? `${besoin.contact.prenom} ${besoin.contact.nom}` : "origine non renseignee");

  notifyAdmins({
    titre: "Nouveau besoin de formation",
    message: `${besoin.titre} — ${origineName}`,
    type: "info",
    lien: `/besoins/${besoin.id}`,
  }).catch(() => {});

  return NextResponse.json(besoin, { status: 201 });
});
