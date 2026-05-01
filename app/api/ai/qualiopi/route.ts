export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askClaude, checkAIKey } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";

export async function POST(req: NextRequest) {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) return NextResponse.json({ error: "Cle Anthropic manquante" }, { status: 500 });
  try {
    const body = await req.json();
    const { action } = body;
    // action: "synthese_qualite" | "plan_amelioration" | "preparer_audit"

    // Collecte donnees reelles
    const evaluations = await prisma.evaluation.findMany({
      where: { estComplete: true },
      include: { session: { include: { formation: { select: { titre: true } } } } },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    const notes = evaluations.filter((e) => e.noteGlobale).map((e) => e.noteGlobale as number);
    const avgNote = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
    const nbEvalsParType: Record<string, number> = {};
    for (const e of evaluations) {
      nbEvalsParType[e.type] = (nbEvalsParType[e.type] || 0) + 1;
    }

    const commentaires = evaluations.filter((e) => e.commentaire).map((e) => e.commentaire).slice(0, 20);

    const contexte = `
Total evaluations completees : ${evaluations.length}
Note moyenne globale : ${avgNote.toFixed(2)}/5
Repartition par type :
${Object.entries(nbEvalsParType).map(([k, v]) => `- ${k} : ${v}`).join("\n")}

Commentaires recents (extrait) :
${commentaires.map((c, i) => `${i + 1}. ${c}`).join("\n") || "Aucun commentaire textuel"}
`.trim();

    let prompt = "";
    if (action === "plan_amelioration") {
      prompt = `Tu es un expert Qualiopi. A partir des donnees qualite ci-dessous, propose un plan d'amelioration continue concret avec 5 actions prioritaires a mettre en oeuvre, en francais.

${contexte}

Pour chaque action :
- **Titre** : titre court de l'action
- **Constat** : ce qui justifie cette action
- **Action a mener** : description concrete
- **Resultat attendu** : indicateur de reussite
- **Responsable suggere** : role concerne`;
    } else if (action === "preparer_audit") {
      prompt = `Tu es un auditeur Qualiopi experimente. A partir des donnees ci-dessous, liste les points d'attention a preparer avant un audit Qualiopi, classes par critere RNQ (1 a 7).

${contexte}

Pour chaque critere concerne :
- **Critere X** : titre du critere
- **Indicateurs a documenter** : liste
- **Risques identifies** : eventuels points faibles
- **Actions de preparation** : quoi preparer avant l'audit`;
    } else {
      // synthese_qualite par defaut
      prompt = `Tu es un consultant qualite specialise en formation professionnelle. Redige une synthese qualite trimestrielle basee sur les donnees ci-dessous, en francais.

${contexte}

Structure :
1. **Indicateurs cles** (resume chiffre)
2. **Points forts identifies** (base sur les commentaires)
3. **Axes d'amelioration** (base sur les commentaires et notes)
4. **Tendances observees**
5. **Recommandations prioritaires** (3 actions concretes)

Sois concis et professionnel.`;
    }

    const text = await askClaude(prompt, 2000);
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("AI qualiopi error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur IA" }, { status: 500 });
  }
}
