export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const POST = withErrorHandlerParams(async (
  _req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.id },
    include: {
      session: {
        include: {
          formation: { select: { titre: true, categorie: true } },
          formateur: { select: { nom: true, prenom: true } },
        },
      },
      contact: { select: { nom: true, prenom: true } },
    },
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Évaluation introuvable" }, { status: 404 });
  }

  // Parse reponses (inner try/catch preserve : reponses peut etre du JSON malforme,
  // on degrade gracieusement vers {} plutot que de 500)
  let reponses: Record<string, unknown> = {};
  try {
    reponses = JSON.parse(evaluation.reponses);
  } catch {
    reponses = {};
  }

  const typeLabel =
    evaluation.type === "satisfaction_chaud" ? "Satisfaction à chaud" :
    evaluation.type === "satisfaction_froid" ? "Satisfaction à froid" :
    evaluation.type === "acquis" ? "Évaluation des acquis" :
    evaluation.type;

  const cibleLabel =
    evaluation.cible === "stagiaire" ? "Stagiaire" :
    evaluation.cible === "client" ? "Client" :
    evaluation.cible === "formateur" ? "Formateur" :
    evaluation.cible;

  const reponsesText = Array.isArray(reponses)
    ? (reponses as Array<{ question?: string; label?: string; note?: number; value?: unknown; reponse?: string }>)
        .map((r, i) => {
          const q = r.question || r.label || `Question ${i + 1}`;
          const v = r.note ?? r.value ?? r.reponse ?? "—";
          return `- ${q} : ${v}`;
        })
        .join("\n")
    : Object.entries(reponses)
        .map(([k, v]) => `- ${k} : ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join("\n");

  const prompt = `Tu es un expert en formation professionnelle et en pédagogie. Analyse cette évaluation de formation et fournis une synthèse professionnelle structurée en français.

**Informations de l'évaluation**
- Type : ${typeLabel}
- Cible : ${cibleLabel}
- Formation : ${evaluation.session.formation.titre}
- Catégorie : ${evaluation.session.formation.categorie || "Non précisée"}
- Formateur : ${evaluation.session.formateur ? `${evaluation.session.formateur.prenom} ${evaluation.session.formateur.nom}` : "Non renseigné"}
- Répondant : ${evaluation.contact ? `${evaluation.contact.prenom} ${evaluation.contact.nom}` : "Anonyme"}
- Note globale : ${evaluation.noteGlobale ? `${evaluation.noteGlobale}/5` : "Non renseignée"}
- Statut : ${evaluation.estComplete ? "Complétée" : "En attente"}

**Réponses détaillées**
${reponsesText || "Aucune réponse détaillée"}

**Commentaire libre**
${evaluation.commentaire || "Aucun commentaire"}

Fournis une analyse structurée avec :
1. **Synthèse générale** (2-3 phrases résumant l'évaluation)
2. **Points forts** (liste à puces)
3. **Points d'amélioration** (liste à puces)
4. **Recommandations** (actions concrètes à mettre en œuvre)
5. **Conclusion** (1-2 phrases)

Sois concis, professionnel et orienté vers l'amélioration continue de la qualité de formation.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const analyse = message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ analyse });
});
