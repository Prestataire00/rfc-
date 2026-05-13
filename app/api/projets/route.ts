export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import {
  projetCreateSchema,
  PROJET_STATUTS,
} from "@/lib/validations/projet";
import { aggregateProjet, buildCode } from "@/lib/projets/aggregate";

/**
 * GET /api/projets
 *
 * Liste paginée + filtrée. Pas de cursor — table modeste (centaines de
 * rows max), offset OK.
 *
 * Query params :
 *   ?statut=en_cours,en_pause   filtre multi (CSV)
 *   ?entrepriseId=cuid          filtre exact
 *   ?formateurId=cuid           filtre via jointure ProjetFormateur
 *   ?priorite=haute,critique    filtre multi
 *   ?q=devops                   recherche sur nom + code + description
 *   ?from=2026-01-01            createdAt >=
 *   ?to=2026-12-31              createdAt <=
 *   ?retard=true                projets en retard uniquement
 *   ?page=1                     défaut 1
 *   ?perPage=20                 défaut 20, max 100
 *   ?sort=updatedAt|dateDebut|nom (default updatedAt)
 *   ?order=asc|desc             default desc
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const p = url.searchParams;

  const page = Math.max(1, Number(p.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(p.get("perPage")) || 20));

  const where: Prisma.ProjetWhereInput = {};
  const statutCsv = p.get("statut");
  if (statutCsv) {
    where.statut = { in: statutCsv.split(",").map((s) => s.trim()) };
  }
  const entrepriseId = p.get("entrepriseId");
  if (entrepriseId) where.entrepriseId = entrepriseId;
  const formateurId = p.get("formateurId");
  if (formateurId) {
    where.formateurs = { some: { formateurId } };
  }
  const prioriteCsv = p.get("priorite");
  if (prioriteCsv) {
    where.priorite = { in: prioriteCsv.split(",").map((s) => s.trim()) };
  }
  const q = p.get("q");
  if (q) {
    where.OR = [
      { nom: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  const from = p.get("from");
  const to = p.get("to");
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  }

  const sortField = (() => {
    const v = p.get("sort") ?? "updatedAt";
    return (["updatedAt", "createdAt", "dateDebut", "nom", "statut"] as const).includes(
      v as never,
    )
      ? v
      : "updatedAt";
  })();
  const order = p.get("order") === "asc" ? "asc" : "desc";

  const [items, total] = await Promise.all([
    prisma.projet.findMany({
      where,
      orderBy: { [sortField]: order },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        entreprise: { select: { id: true, nom: true } },
        formateurs: {
          include: {
            formateur: { select: { id: true, nom: true, prenom: true } },
          },
        },
        _count: {
          select: { besoins: true, devis: true, sessions: true, factures: true },
        },
      },
    }),
    prisma.projet.count({ where }),
  ]);

  // Filtre retard côté code (impose un calcul) — fait après pagination,
  // donc on l'applique uniquement comme filtre post-fetch si demandé.
  // Pour de gros volumes on dénormaliserait en DB.
  const retardOnly = p.get("retard") === "true";
  const now = new Date();
  const filtered = retardOnly
    ? items.filter(
        (p) =>
          p.dateFinPrevue &&
          p.dateFinPrevue.getTime() < now.getTime() &&
          !["termine", "archive"].includes(p.statut),
      )
    : items;

  return NextResponse.json({
    items: filtered,
    total,
    page,
    perPage,
    statuts: PROJET_STATUTS,
  });
});

/**
 * POST /api/projets
 *
 * Création. Le code projet (référence courte) est auto-généré si absent :
 * "PROJ-YYYY-NNN" basé sur le compteur de projets créés cette année.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = projetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;

  let code = data.code ?? null;
  if (!code) {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const count = await prisma.projet.count({
      where: { createdAt: { gte: yearStart } },
    });
    code = buildCode(year, count + 1);
  }

  const projet = await prisma.projet.create({
    data: {
      nom: data.nom,
      code,
      description: data.description ?? null,
      statut: data.statut ?? "brouillon",
      priorite: data.priorite ?? "normale",
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
      dateFinPrevue: data.dateFinPrevue ? new Date(data.dateFinPrevue) : null,
      dateFinReelle: data.dateFinReelle ? new Date(data.dateFinReelle) : null,
      chefProjet: data.chefProjet ?? null,
      budget: data.budget ?? null,
      objectifs: data.objectifs ?? null,
      livrables: data.livrables ?? null,
      entrepriseId: data.entrepriseId ?? null,
      formateurs: data.formateurIds
        ? {
            create: data.formateurIds.map((formateurId) => ({ formateurId })),
          }
        : undefined,
    },
    include: {
      entreprise: { select: { id: true, nom: true } },
      formateurs: { include: { formateur: true } },
    },
  });

  return NextResponse.json(projet, { status: 201 });
});
