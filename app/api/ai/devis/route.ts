export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { askClaude, checkAIKey } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";
import { withErrorHandler } from "@/lib/api-wrapper";

const aiDevisSchema = z.object({
  action: z.enum(["objet", "notes", "proposition"]).optional(),
  formationId: z.string().optional().nullable(),
  nbStagiaires: z.number().int().positive().optional().nullable(),
  entrepriseId: z.string().optional().nullable(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) return NextResponse.json({ error: "Cle Anthropic manquante" }, { status: 500 });

  const raw = await req.json().catch(() => null);
  const parsed = aiDevisSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { action, formationId, nbStagiaires, entrepriseId } = parsed.data;
  // action: "objet" | "notes" | "proposition"

  let contexte = "";
  if (formationId) {
    const f = await prisma.formation.findUnique({ where: { id: formationId } });
    if (f) {
      contexte += `Formation : ${f.titre}`;
      if (f.categorie) contexte += ` - ${f.categorie}`;
      contexte += `\nDuree : ${f.duree}h - Tarif : ${f.tarif}EUR`;
      if (f.objectifs) contexte += `\nObjectifs : ${f.objectifs}`;
    }
  }
  if (nbStagiaires) contexte += `\nNombre de stagiaires : ${nbStagiaires}`;
  if (entrepriseId) {
    const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
    if (e) contexte += `\nClient : ${e.nom}${e.secteur ? ` (${e.secteur})` : ""}`;
  }

  let prompt = "";
  if (action === "objet") {
    prompt = `Redige un objet de devis clair et professionnel, en francais, en une seule ligne (max 80 caracteres).\n\n${contexte}\n\nReponds UNIQUEMENT avec l'objet, sans guillemets ni autre texte.`;
  } else if (action === "notes") {
    prompt = `Redige les conditions particulieres et informations complementaires pour un devis de formation professionnelle, en francais (3-5 phrases). Inclus : conditions de paiement, modalite d'annulation, convention de formation.\n\n${contexte}`;
  } else {
    prompt = `Redige une proposition commerciale structuree pour ce devis de formation, en francais. Structure : contexte client, solution proposee, benefices attendus, modalites.\n\n${contexte}`;
  }

  const text = await askClaude(prompt, 1500);
  return NextResponse.json({ text });
});
