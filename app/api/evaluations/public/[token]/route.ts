export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { notifyAllAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";

// GET: Retrieve evaluation info by token (public, no auth)
// Priority order for questions source:
//   1. evaluation.questionsSnapshot (figee au moment de l'envoi)
//   2. Template preset associe au type (fallback)
//   3. QuestionnaireConfig (legacy format pour anciennes evals)
export const GET = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:eval:get");
  if (limited) return limited;

  const evaluation = await prisma.evaluation.findUnique({
    where: { tokenAcces: params.token },
    include: {
      session: { include: { formation: { select: { titre: true } } } },
      contact: { select: { nom: true, prenom: true } },
    },
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  const stagiaire = evaluation.contact
    ? `${evaluation.contact.prenom} ${evaluation.contact.nom}`
    : "Anonyme";

  const baseInfo = {
    id: evaluation.id,
    type: evaluation.type,
    estComplete: evaluation.estComplete,
    formation: evaluation.session.formation.titre,
    stagiaire,
  };

  // 1. Snapshot stocke sur l'evaluation — prioritaire
  if (evaluation.questionsSnapshot) {
    try {
      const questions = JSON.parse(evaluation.questionsSnapshot);
      if (Array.isArray(questions) && questions.length > 0) {
        return NextResponse.json({ ...baseInfo, isCustom: true, questions });
      }
    } catch { /* fall through */ }
  }

  // 2. Fallback : detecter si reponses contient un custom template (ancien format)
  try {
    const parsed = JSON.parse(evaluation.reponses);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] && "type" in parsed[0] && "label" in parsed[0]) {
      return NextResponse.json({ ...baseInfo, isCustom: true, questions: parsed });
    }
  } catch { /* not custom */ }

  // 3. Fallback preset par type
  if (["satisfaction_chaud", "satisfaction_froid", "acquis"].includes(evaluation.type)) {
    const presetId = evaluation.type === "satisfaction_chaud" ? "preset_satisfaction_chaud"
      : evaluation.type === "satisfaction_froid" ? "preset_satisfaction_froid"
      : "preset_acquis_post";
    const preset = await prisma.evaluationTemplate.findUnique({ where: { id: presetId } });
    if (preset) {
      try {
        const questions = JSON.parse(preset.questions);
        if (Array.isArray(questions) && questions.length > 0) {
          return NextResponse.json({ ...baseInfo, isCustom: true, questions });
        }
      } catch { /* fall through */ }
    }
  }

  // 4. Legacy: QuestionnaireConfig sections
  const config = await prisma.questionnaireConfig.findUnique({ where: { id: "default" } });
  const sections = evaluation.type === "satisfaction_froid" ? (config?.froid ?? []) : (config?.chaud ?? []);
  return NextResponse.json({ ...baseInfo, isCustom: false, sections });
});

// POST: Submit evaluation (public, no auth)
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:eval:post");
  if (limited) return limited;

  const evaluation = await prisma.evaluation.findUnique({ where: { tokenAcces: params.token } });
  if (!evaluation) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (evaluation.estComplete) return NextResponse.json({ error: "Cette evaluation a deja ete soumise" }, { status: 400 });

  const body = await req.json();
  const { noteGlobale, reponses, commentaire, isCustom } = body;

  if (!isCustom && (!noteGlobale || noteGlobale < 1 || noteGlobale > 5)) {
    return NextResponse.json({ error: "Note globale requise (1-5)" }, { status: 400 });
  }

  // Derive noteGlobale from first "note" answer if custom form
  let finalNote: number | null = noteGlobale || null;
  if (isCustom && reponses && typeof reponses === "object" && !Array.isArray(reponses)) {
    // reponses is a map { questionId: value }
    // Find the first numeric value (first "note" answered)
    const firstNumeric = Object.values(reponses).find((v) => typeof v === "number");
    if (typeof firstNumeric === "number" && firstNumeric >= 1 && firstNumeric <= 5) {
      finalNote = firstNumeric;
    }
  }

  await prisma.evaluation.update({
    where: { tokenAcces: params.token },
    data: {
      noteGlobale: finalNote,
      reponses: JSON.stringify(reponses || {}),
      commentaire: commentaire || null,
      estComplete: true,
    },
  });

  try {
    const evalDetail = await prisma.evaluation.findUnique({
      where: { tokenAcces: params.token },
      include: { session: { include: { formation: { select: { titre: true } } } } },
    });
    if (evalDetail) {
      const note = finalNote ?? "—";
      await notifyAllAdmins({
        titre: "Évaluation reçue",
        message: `Note ${note}/5 — ${evalDetail.session.formation.titre}`,
        type: "info",
        lien: "/evaluations",
      });
    }
  } catch (e) {
    logger.warn("notify.evaluation_completed_failed", { error: String(e) });
  }

  return NextResponse.json({ success: true });
});
