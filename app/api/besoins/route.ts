export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

const besoinSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional().nullable(),
  origine: z.enum(["client", "stagiaire", "centre"]).default("client"),
  statut: z.enum(["nouveau", "qualifie", "devis_envoye", "accepte", "refuse", "archive"]).default("nouveau"),
  priorite: z.enum(["basse", "normale", "haute", "urgente"]).default("normale"),
  nbStagiaires: z.coerce.number().int().positive().optional().nullable(),
  datesSouhaitees: z.string().optional().nullable(),
  budget: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  entrepriseId: z.string().cuid().optional().nullable(),
  contactId: z.string().cuid().optional().nullable(),
  formationId: z.string().cuid().optional().nullable(),
});

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
  for (const key of ["nbStagiaires", "budget", "entrepriseId", "contactId", "formationId", "description", "datesSouhaitees", "notes"]) {
    if (cleaned[key] === "") cleaned[key] = null;
  }
  const data = besoinSchema.parse(cleaned);

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
