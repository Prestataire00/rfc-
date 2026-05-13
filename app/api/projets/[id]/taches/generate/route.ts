// POST /api/projets/[id]/taches/generate
//
// Génère via Claude une proposition de liste de tâches actionnables à partir
// des objectifs du projet (champ Projet.objectifs). NE crée RIEN en BD — c'est
// une preview que l'admin peut éditer avant validation via POST .../accept.
//
// Format de sortie attendu : array JSON [{ titre, description, priorite }].
// On force le modèle à produire du JSON strict avec un prompt très balisé +
// retry si la première sortie n'est pas valide.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { AI_MODEL, checkAIKey } from "@/lib/ai";

export const dynamic = "force-dynamic";

interface Suggestion {
  titre: string;
  description: string;
  priorite: "basse" | "moyenne" | "haute" | "urgente";
}

function buildPrompt(args: {
  projetNom: string;
  objectifs: string;
  livrables: string | null;
  description: string | null;
}): string {
  return `Tu es un chef de projet expérimenté dans le secteur de la formation professionnelle.

Voici un projet à découper en tâches actionnables :

# Projet
Nom : ${args.projetNom}
${args.description ? `Description : ${args.description}` : ""}

# Objectifs (à transformer en tâches)
${args.objectifs}

${args.livrables ? `# Livrables attendus\n${args.livrables}` : ""}

# Mission
Propose entre 5 et 12 tâches actionnables qui couvrent l'ensemble des objectifs. Chaque tâche doit être :
- Précise et exécutable (verbe d'action en début)
- Auto-suffisante (pas de "voir plus haut")
- Pertinente pour un formateur ou chef de projet du domaine formation

# Format de sortie obligatoire
Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans texte avant ni après. Chaque élément :
{
  "titre": "string court 60 chars max",
  "description": "string 100-200 chars expliquant ce qu'il faut faire",
  "priorite": "basse" | "moyenne" | "haute" | "urgente"
}

Exemple de sortie attendue :
[
  {"titre": "Rédiger le cahier des charges pédagogique", "description": "Détailler les objectifs d'apprentissage, prérequis, modalités et critères d'évaluation pour validation par le client.", "priorite": "haute"},
  {"titre": "Préparer le support de cours", "description": "Concevoir les diapositives et exercices alignés sur les objectifs définis dans le cahier des charges.", "priorite": "moyenne"}
]

Ta réponse :`;
}

function tryParseSuggestions(raw: string): Suggestion[] | null {
  // Le modèle peut entourer le JSON de \`\`\`json...\`\`\` malgré l'instruction.
  // On extrait le premier tableau qu'on trouve.
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    const cleaned: Suggestion[] = parsed
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .map((x) => ({
        titre: String(x.titre ?? "").trim().slice(0, 120),
        description: String(x.description ?? "").trim().slice(0, 500),
        priorite: (["basse", "moyenne", "haute", "urgente"] as const).includes(
          x.priorite as Suggestion["priorite"],
        )
          ? (x.priorite as Suggestion["priorite"])
          : "moyenne",
      }))
      .filter((s) => s.titre.length > 0);
    return cleaned;
  } catch {
    return null;
  }
}

export const POST = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!checkAIKey()) {
    return NextResponse.json(
      { error: "Clé Anthropic non configurée — définir ANTHROPIC_API_KEY" },
      { status: 503 },
    );
  }

  const projet = await prisma.projet.findUnique({
    where: { id: ctx.params.id },
    select: { id: true, nom: true, objectifs: true, livrables: true, description: true },
  });
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  if (!projet.objectifs || projet.objectifs.trim().length < 20) {
    return NextResponse.json(
      { error: "Renseigne les objectifs du projet (min. 20 caractères) pour pouvoir générer des tâches." },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = buildPrompt({
    projetNom: projet.nom,
    objectifs: projet.objectifs,
    livrables: projet.livrables,
    description: projet.description,
  });

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text : "";
  const suggestions = tryParseSuggestions(raw);
  if (!suggestions || suggestions.length === 0) {
    return NextResponse.json(
      { error: "La réponse de l'IA n'a pas pu être interprétée. Réessaie.", raw },
      { status: 502 },
    );
  }

  return NextResponse.json({ suggestions });
});
