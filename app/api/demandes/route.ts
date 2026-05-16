export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import { demandeSchema } from "@/lib/validations/demande";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (statut) where.statut = statut;

  const demandes = await prisma.demande.findMany({
    where,
    include: {
      entreprise: { select: { id: true, nom: true } },
      contact: { select: { id: true, prenom: true, nom: true } },
      formation: { select: { id: true, titre: true } },
      devis: { select: { id: true, numero: true, statut: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(demandes);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Pre-clean : convert "" -> null on optional fields before zod parse.
  const raw = await req.json();
  const cleaned = { ...raw };
  for (const key of ["nbStagiaires", "budget", "entrepriseId", "contactId", "formationId", "description", "datesSouhaitees", "notes", "sourceContact", "observation"]) {
    if (cleaned[key] === "") cleaned[key] = null;
  }
  const data = demandeSchema.parse(cleaned);

  const demande = await prisma.demande.create({
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
    besoinId: demande.id,
    entrepriseId: demande.entrepriseId ?? undefined,
    contactId: demande.contactId ?? undefined,
    formationId: demande.formationId ?? undefined,
  }).catch((err) => logger.warn("automation.besoin_created_failed", { error: String(err) }));

  const origineName = demande.entreprise?.nom
    || (demande.contact ? `${demande.contact.prenom} ${demande.contact.nom}` : "origine non renseignee");

  notifyAdmins({
    titre: "Nouveau besoin de formation",
    message: `${demande.titre} — ${origineName}`,
    type: "info",
    lien: `/demandes/${demande.id}`,
  }).catch(() => {});

  return NextResponse.json(demande, { status: 201 });
});
