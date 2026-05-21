export const dynamic = "force-dynamic";

// POST /api/ai/modele-document
// Genere un modele de document professionnel via Claude a partir d'une
// description en langage naturel. Renvoie un preview (JSON valide) — ne
// sauvegarde rien : la persistance se fait via POST /api/modeles-document.

import { NextRequest, NextResponse } from "next/server";
import { askClaude, checkAIKey } from "@/lib/ai";
import { withErrorHandler } from "@/lib/api-wrapper";
import {
  modeleDocumentGenerateSchema,
  modeleDocumentAiOutputSchema,
} from "@/lib/validations/modele-document";
import { logger } from "@/lib/logger";

function buildPrompt(description: string): string {
  return `Tu es un assistant pour un organisme de formation francais (securite, incendie, prevention).
L'administrateur souhaite un modele de document reutilisable. Voici sa demande :

"${description}"

TACHE : redige un modele de document professionnel, en francais, conforme aux usages d'un organisme de formation francais.
Le document doit pouvoir etre reutilise pour plusieurs destinataires : insere des variables au format {{categorie.champ}} la ou des donnees personnalisees doivent apparaitre.
Variables courantes disponibles : {{contact.nom}}, {{contact.prenom}}, {{contact.civilite}}, {{session.dateDebut}}, {{session.dateFin}}, {{session.lieu}}, {{formation.titre}}, {{formation.duree}}, {{entreprise.nomEntreprise}}, {{entreprise.adresse}}, {{entreprise.siret}}, {{entreprise.nda}}, {{date.aujourdhui}}.
Tu peux inventer d'autres variables si le contexte l'exige, toujours au format {{categorie.champ}}.

Retourne UNIQUEMENT un JSON valide avec cette structure exacte (pas de markdown, pas de texte autour, pas de commentaire) :
{
  "titre": "<titre court du document>",
  "introduction": "<phrase d'introduction ou objet du document, peut etre vide>",
  "corps": "<corps complet du document ; utilise des sauts de ligne reels pour separer les paragraphes ; integre les variables {{...}}>",
  "mentions": "<mentions legales ou de pied de page eventuelles, peut etre vide>",
  "variables": [
    { "nom": "<nom exact de la variable sans accolades, ex: contact.nom>", "description": "<role de la variable>" }
  ]
}
La liste "variables" doit recenser toutes les variables {{...}} reellement utilisees dans le corps, l'introduction ou les mentions.`;
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  if (!checkAIKey()) {
    return NextResponse.json(
      { error: "Cle Anthropic non configuree" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = modeleDocumentGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Donnees invalides", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let rawResponse: string;
  try {
    // noMarkdown: false pour preserver le JSON brut (cleanAIResponse() enleverait {} etc.)
    rawResponse = await askClaude(buildPrompt(parsed.data.description), 2500, {
      noMarkdown: false,
    });
  } catch (err) {
    logger.error("ai.modele-document.claude-call-failed", err);
    return NextResponse.json(
      { error: "Erreur lors de l'appel a l'IA" },
      { status: 502 },
    );
  }

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: "Reponse IA sans JSON detectable" },
      { status: 422 },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "JSON IA malforme" }, { status: 422 });
  }

  const validation = modeleDocumentAiOutputSchema.safeParse(parsedJson);
  if (!validation.success) {
    logger.warn("ai.modele-document.zod-validation-failed", {
      errors: validation.error.flatten(),
    });
    return NextResponse.json(
      { error: "Structure JSON IA invalide", issues: validation.error.issues },
      { status: 422 },
    );
  }

  return NextResponse.json(validation.data);
});
