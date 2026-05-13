export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

/**
 * GET /api/entreprises/search?q=nom
 *
 * Recherche d'entreprises avec auto-complétion. Combine :
 *   1. Les entreprises **déjà créées** dans Prisma (matching par nom, max 5)
 *   2. Les résultats de l'API publique data.gouv (recherche-entreprises.api.gouv.fr)
 *
 * Retourne un tableau unifié pour que le frontend affiche une dropdown unique.
 * Les entreprises déjà créées sont marquées `existing: true` (pas besoin
 * d'upsert au moment de la sélection).
 *
 * API externe : sans clé, gratuite, ~3-5 req/s autorisés.
 */
type SearchResult = {
  id: string | null; // null si pas encore créée en Prisma
  existing: boolean;
  nom: string;
  siret: string | null;
  siren: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  codeApe: string | null;
  libelleApe: string | null;
};

export const GET = withErrorHandler(async (req: NextRequest) => {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // 1) Local : entreprises déjà en DB (priorité — évite de re-créer)
  const local = await prisma.entreprise.findMany({
    where: {
      OR: [
        { nom: { contains: q, mode: "insensitive" } },
        { siret: { contains: q.replace(/\s/g, "") } },
      ],
    },
    take: 5,
    select: {
      id: true,
      nom: true,
      siret: true,
      adresse: true,
      codePostal: true,
      ville: true,
    },
  });

  const localResults: SearchResult[] = local.map((e) => ({
    id: e.id,
    existing: true,
    nom: e.nom,
    siret: e.siret,
    siren: e.siret ? e.siret.slice(0, 9) : null,
    adresse: e.adresse,
    codePostal: e.codePostal,
    ville: e.ville,
    codeApe: null,
    libelleApe: null,
  }));

  // 2) API gouv (best-effort — si timeout ou erreur, on retourne juste le local)
  let externalResults: SearchResult[] = [];
  try {
    const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=5`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const json = (await response.json()) as { results?: GouvEntreprise[] };
      externalResults =
        json.results
          ?.map(mapGouvToResult)
          .filter(
            (r) =>
              // Évite les doublons avec le local : si on connaît déjà ce siret,
              // on garde l'entrée locale (qui contient l'id Prisma).
              !r.siret ||
              !localResults.some((l) => l.siret === r.siret),
          ) ?? [];
    }
  } catch {
    // ignore — on retourne ce qu'on a depuis le local
  }

  return NextResponse.json({ items: [...localResults, ...externalResults] });
});

type GouvEntreprise = {
  siren: string;
  nom_raison_sociale?: string;
  nom_complet?: string;
  siege?: {
    siret: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    activite_principale?: string;
    libelle_activite_principale?: string;
  };
};

function mapGouvToResult(e: GouvEntreprise): SearchResult {
  return {
    id: null,
    existing: false,
    nom: e.nom_raison_sociale ?? e.nom_complet ?? "(sans nom)",
    siret: e.siege?.siret ?? null,
    siren: e.siren,
    adresse: e.siege?.adresse ?? null,
    codePostal: e.siege?.code_postal ?? null,
    ville: e.siege?.libelle_commune ?? null,
    codeApe: e.siege?.activite_principale ?? null,
    libelleApe: e.siege?.libelle_activite_principale ?? null,
  };
}
