export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askClaude, checkAIKey } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";

// POST /api/ai/qualiopi/suggerer
// Body: { type: "amelioration" | "incident" | "audit", count?: number }
// Retour: { items: [...] } tableau structure d'actions/incidents/points d'audit
export async function POST(req: NextRequest) {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) return NextResponse.json({ error: "Cle Anthropic manquante" }, { status: 500 });

  try {
    const body = await req.json();
    const type = body.type as "amelioration" | "incident" | "audit";
    const count = Math.min(10, Math.max(1, body.count || 3));

    if (!["amelioration", "incident", "audit"].includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    // Donnees qualite pour contextualiser
    const evaluations = await prisma.evaluation.findMany({
      where: { estComplete: true },
      include: { session: { include: { formation: { select: { titre: true, categorie: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const notes = evaluations.filter((e) => e.noteGlobale).map((e) => e.noteGlobale as number);
    const avgNote = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
    const commentaires = evaluations.filter((e) => e.commentaire).map((e) => e.commentaire).slice(0, 15);

    const contexte = `
Total evaluations completees : ${evaluations.length}
Note moyenne globale : ${avgNote.toFixed(2)}/5
Commentaires recents (extrait) :
${commentaires.map((c, i) => `${i + 1}. ${c}`).join("\n") || "Aucun commentaire textuel"}
`.trim();

    let prompt = "";
    let schemaHint = "";

    if (type === "amelioration") {
      schemaHint = `[{"description":"constat identifie","action_taken":"action corrective a mener","result":"resultat attendu mesurable","responsible":"role concerne (ex: responsable pedagogique)"}]`;
      prompt = `Tu es un expert Qualiopi specialise en amelioration continue (critere 32).
A partir des donnees qualite ci-dessous, propose ${count} actions d'amelioration concretes et pragmatiques pour un organisme de formation.

${contexte}

Reponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni apres, sans markdown code fence.
Format strict :
${schemaHint}

Chaque action doit etre specifique, actionnable, et directement issue des donnees. Ne propose pas d'actions generiques.`;
    }

    if (type === "incident") {
      schemaHint = `[{"nom":"titre court de l'incident","description":"description detaillee","source":"Entreprise|Apprenant|Formateur","sujet":"Pedagogique|Administratif|Technique","gravite":"Faible|Modere|Grave","action_menee":"action corrective proposee"}]`;
      prompt = `Tu es un expert Qualiopi specialise en gestion des reclamations et incidents.
A partir des commentaires negatifs ou signaux faibles dans les donnees ci-dessous, identifie ${count} incidents potentiels ou reclamations typiques qui meritent d'etre tracees pour un organisme de formation professionnel.

${contexte}

Reponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni apres, sans markdown code fence.
Format strict :
${schemaHint}

- source : obligatoirement l'une de "Entreprise", "Apprenant", "Formateur"
- sujet : obligatoirement l'un de "Pedagogique", "Administratif", "Technique"
- gravite : obligatoirement l'une de "Faible", "Modere", "Grave"
Base-toi sur les signaux reels du contexte, pas sur des exemples theoriques.`;
    }

    if (type === "audit") {
      schemaHint = `[{"critere":"numero du critere RNQ (1-7)","titre":"titre du point","risque":"niveau de risque identifie","preparation":"ce qu'il faut preparer ou documenter","priorite":"haute|moyenne|faible"}]`;
      prompt = `Tu es un auditeur Qualiopi experimente.
A partir des donnees qualite ci-dessous, liste ${count} points d'attention a preparer en priorite pour un audit Qualiopi (surveillance ou renouvellement).

${contexte}

Reponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni apres, sans markdown code fence.
Format strict :
${schemaHint}

- critere : entier 1 a 7 (selon les 7 criteres du RNQ)
- priorite : obligatoirement l'une de "haute", "moyenne", "faible"
Concentre-toi sur les vrais risques detectables dans les donnees, pas sur une checklist theorique.`;
    }

    const text = await askClaude(prompt, 2500);

    // Essayer d'extraire le JSON (robuste a quelques caracteres parasites)
    let items: unknown[] = [];
    try {
      const trimmed = text.trim();
      // Retire eventuellement les fences ```json ... ```
      const cleaned = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      // Si la chaine commence par un tableau
      const firstBracket = cleaned.indexOf("[");
      const lastBracket = cleaned.lastIndexOf("]");
      const jsonStr = firstBracket >= 0 && lastBracket > firstBracket ? cleaned.slice(firstBracket, lastBracket + 1) : cleaned;
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) items = parsed;
    } catch (parseErr) {
      console.error("JSON parse error, raw text:", text.slice(0, 500));
      return NextResponse.json({ error: "Reponse IA non parsable", raw: text.slice(0, 1000) }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (err: unknown) {
    console.error("AI qualiopi suggerer error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur IA" }, { status: 500 });
  }
}
