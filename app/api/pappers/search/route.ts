export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // API officielle française — gratuite, sans clé API
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=8`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) {
      return NextResponse.json({ error: "Erreur API" }, { status: res.status });
    }

    const data = await res.json();

    const results = (data.results || []).map((r: Record<string, unknown>) => {
      const siege = (r.siege || {}) as Record<string, unknown>;

      // Construire l'adresse rue depuis les composants
      const numVoie = siege.numero_voie as string | undefined;
      const typeVoie = siege.type_voie as string | undefined;
      const libelleVoie = siege.libelle_voie as string | undefined;
      const adresse = [numVoie, typeVoie, libelleVoie].filter(Boolean).join(" ") || undefined;

      return {
        nom: r.nom_raison_sociale as string,
        siret: siege.siret as string | undefined,
        siren: r.siren as string | undefined,
        adresse,
        codePostal: siege.code_postal as string | undefined,
        ville: siege.libelle_commune as string | undefined,
        secteur: (siege.activite_principale as string | undefined),
        formeJuridique: r.categorie_juridique_libelle as string | undefined,
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("Erreur API recherche entreprises:", err);
    return NextResponse.json({ error: "Erreur lors de la recherche" }, { status: 500 });
  }
}
