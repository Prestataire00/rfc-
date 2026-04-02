export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.PAPPERS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Clé API Pappers non configurée" }, { status: 500 });
  }

  try {
    const url = `https://api.pappers.fr/v2/recherche?q=${encodeURIComponent(q)}&api_token=${apiKey}&par_page=8`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) {
      return NextResponse.json({ error: "Erreur Pappers" }, { status: res.status });
    }

    const data = await res.json();
    const results = (data.resultats || []).map((r: Record<string, unknown>) => {
      const siege = (r.siege || {}) as Record<string, unknown>;
      return {
        nom: r.nom_entreprise as string,
        siret: r.siret as string,
        siren: r.siren as string,
        adresse: siege.adresse_ligne_1 as string | undefined,
        codePostal: siege.code_postal as string | undefined,
        ville: siege.ville as string | undefined,
        secteur: r.libelle_code_naf as string | undefined,
        formeJuridique: r.forme_juridique as string | undefined,
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("Erreur API Pappers:", err);
    return NextResponse.json({ error: "Erreur lors de la recherche" }, { status: 500 });
  }
}
