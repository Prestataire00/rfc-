export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { askClaude, checkAIKey } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";

export async function POST(req: NextRequest) {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) return NextResponse.json({ error: "Cle Anthropic manquante (ANTHROPIC_API_KEY)" }, { status: 500 });
  try {
    const body = await req.json();
    const { field, titre, categorie, niveau, duree, modalite, description, objectifs } = body;

    const contexte = `
Titre : ${titre || "Non precise"}
Categorie : ${categorie || "Non precisee"}
Niveau : ${niveau || "tous"}
Duree : ${duree ? `${duree}h` : "Non precisee"}
Modalite : ${modalite || "presentiel"}
${description ? `Description existante : ${description}` : ""}
${objectifs ? `Objectifs existants : ${objectifs}` : ""}
`.trim();

    let prompt = "";
    if (field === "description") {
      prompt = `Tu es un expert en ingenierie pedagogique. Redige une description professionnelle de 3 a 5 phrases pour cette formation, en francais, orientee benefices pour le stagiaire.\n\n${contexte}\n\nReponds uniquement avec le texte de la description, sans titre ni puces.`;
    } else if (field === "objectifs") {
      prompt = `Tu es un expert en ingenierie pedagogique. Redige 4 a 6 objectifs pedagogiques operationnels (commencant par un verbe d'action : identifier, appliquer, maitriser...) pour cette formation, en francais.\n\n${contexte}\n\nReponds avec une liste a puces "- ..." sans autre texte.`;
    } else if (field === "contenuProgramme") {
      prompt = `Tu es un expert en ingenierie pedagogique. Redige le programme detaille de cette formation decoupe en modules (Module 1 : ..., Module 2 : ...) avec sous-points sous chaque module, en francais.\n\n${contexte}\n\nReponds uniquement avec le programme structure.`;
    } else if (field === "publicCible") {
      prompt = `Tu es un expert en formation professionnelle. Decris en 2-3 phrases le public cible ideal de cette formation, en francais.\n\n${contexte}\n\nReponds uniquement avec le texte.`;
    } else if (field === "prerequis") {
      prompt = `Tu es un expert en formation. Liste les prerequis necessaires pour cette formation, en francais. Si aucun prerequis particulier, indique "Aucun prerequis specifique".\n\n${contexte}\n\nReponds de maniere concise.`;
    } else if (field === "methodesPedagogiques") {
      prompt = `Tu es un expert en ingenierie pedagogique. Decris les methodes pedagogiques adaptees a cette formation (theorie, pratique, mises en situation, etc.) en 3-5 phrases, en francais.\n\n${contexte}\n\nReponds uniquement avec le texte.`;
    } else if (field === "methodesEvaluation") {
      prompt = `Tu es un expert en ingenierie pedagogique. Decris les methodes d'evaluation des acquis pour cette formation (QCM, mise en situation, etc.) en 3-5 phrases, en francais.\n\n${contexte}\n\nReponds uniquement avec le texte.`;
    } else if (field === "moyensTechniques") {
      prompt = `Tu es un expert en formation. Liste les moyens techniques et materiels necessaires pour cette formation, en francais, sous forme de puces.\n\n${contexte}\n\nReponds avec une liste.`;
    } else if (field === "accessibilite") {
      prompt = `Redige une mention accessibilite PMR standard pour cette formation conforme aux exigences Qualiopi, en francais (3-4 phrases).\n\n${contexte}\n\nReponds uniquement avec le texte.`;
    } else {
      return NextResponse.json({ error: "Champ non supporte" }, { status: 400 });
    }

    const text = await askClaude(prompt, 1500);
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("AI formation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur IA" }, { status: 500 });
  }
}
