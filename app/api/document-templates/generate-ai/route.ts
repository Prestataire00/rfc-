export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandler } from "@/lib/api-wrapper";
import { askClaude, checkAIKey } from "@/lib/ai";
import { parseBody } from "@/lib/validations/helpers";

/**
 * POST /api/document-templates/generate-ai
 *
 * Génère un contenu de template de document via Claude à partir d'un brief
 * texte libre. Retourne un objet {titre, introduction, corps, mentions}
 * que l'utilisateur peut ensuite valider / éditer puis sauver via
 * PUT /api/document-templates/[id].
 *
 * Ne persiste rien : l'utilisateur a toujours le dernier mot.
 */

const bodySchema = z.object({
  type: z.string().min(1), // convocation, convention, attestation, etc.
  brief: z.string().min(10).max(4000),
  // Variables disponibles que l'IA peut intégrer dans le contenu
  variables: z
    .array(
      z.object({
        nom: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  if (!checkAIKey()) {
    return NextResponse.json(
      { error: "Clé Anthropic non configurée (ANTHROPIC_API_KEY)" },
      { status: 503 },
    );
  }

  const { type, brief, variables } = await parseBody(req, bodySchema);

  const variablesDoc = variables
    .map((v) => `  - {{${v.nom}}}${v.description ? ` : ${v.description}` : ""}`)
    .join("\n");

  const prompt = `Tu génères le contenu d'un template de document professionnel pour un organisme de formation (Qualiopi) en France.

Type de document : **${type}**

Brief utilisateur :
"""
${brief}
"""

Variables disponibles (à intégrer dans le contenu sous la forme {{nom_variable}}) :
${variablesDoc || "  (aucune variable spécifique)"}

Génère 4 sections :

1. **titre** : titre principal du document, court (max 80 caractères), peut contenir des variables
2. **introduction** : 1 à 3 phrases d'accroche, peut contenir des variables
3. **corps** : contenu principal du document. Saut de ligne entre les paragraphes via \\n. Utilise les variables fournies de manière naturelle. Style professionnel, conforme aux usages français.
4. **mentions** : mentions légales / pied de page (1 à 3 phrases). Optionnel.

IMPORTANT :
- Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après.
- Format strict : {"titre": "...", "introduction": "...", "corps": "...", "mentions": "..."}
- N'invente pas de variables qui ne sont pas dans la liste. Tu peux utiliser celles fournies ou n'en utiliser aucune.
- Pas de markdown, pas de gras, pas de listes à puces. Texte brut uniquement.
- Si une section est inutile (ex: mentions pour un document interne), retourne une chaîne vide "".`;

  const raw = await askClaude(prompt, 2500, { noMarkdown: false });

  // Claude peut envelopper le JSON dans ```json ... ``` — on extrait.
  const jsonText = extractJson(raw);
  let parsed: { titre?: string; introduction?: string; corps?: string; mentions?: string };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return NextResponse.json(
      {
        error:
          "L'IA n'a pas retourné un JSON valide. Reformule ton brief et réessaie.",
        raw: raw.slice(0, 500),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    titre: String(parsed.titre ?? "").trim(),
    introduction: String(parsed.introduction ?? "").trim(),
    corps: String(parsed.corps ?? "").trim(),
    mentions: String(parsed.mentions ?? "").trim(),
  });
});

function extractJson(text: string): string {
  // Cherche un bloc ```json ... ``` ou ``` ... ```
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced && fenced[1]) return fenced[1];
  // Sinon prend tout entre les premières { et dernières }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}
