export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askClaudeVision, checkAIKey, normalizeVisionMediaType } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";
import { withErrorHandler } from "@/lib/api-wrapper";

const VISION_PROMPT = `Analyse ce document professionnel/formation. Reponds en JSON strict (pas de markdown) avec ces champs :
{
  "type": "habilitation_electrique" | "carte_btp" | "carte_pro" | "diplome" | "sst" | "afgsu" | "incendie" | "autre",
  "nom_titulaire": "...",
  "organisme_emetteur": "...",
  "date_emission": "YYYY-MM-DD" ou null,
  "date_expiration": "YYYY-MM-DD" ou null,
  "numero_document": "..." ou null,
  "niveau_habilitation": "..." ou null,
  "score_confiance": 0-100,
  "details": "description courte du document"
}
Si tu ne peux pas extraire une info, mets null. Le score_confiance reflete ta certitude globale sur l'extraction.`;

// POST /api/ai/document-analysis — analyse un document uploade avec Claude Vision.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) return NextResponse.json({ error: "Cle API Anthropic non configuree" }, { status: 500 });

  const { contactId, documentUrl, documentNom } = await req.json();
  if (!contactId || !documentUrl) {
    return NextResponse.json({ error: "contactId et documentUrl requis" }, { status: 400 });
  }

  const imgRes = await fetch(documentUrl);
  if (!imgRes.ok) return NextResponse.json({ error: "Impossible de telecharger le document" }, { status: 400 });

  const buf = Buffer.from(await imgRes.arrayBuffer());
  const base64 = buf.toString("base64");
  const mediaType = normalizeVisionMediaType(imgRes.headers.get("content-type"));

  const responseText = await askClaudeVision(base64, mediaType, VISION_PROMPT, 1500);

  let parsed: Record<string, unknown> = {};
  try {
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { details: responseText, score_confiance: 0 };
  }

  const score = typeof parsed.score_confiance === "number" ? parsed.score_confiance : 0;

  let statut = "a_verifier";
  if (score >= 90) statut = "valide_auto";
  else if (score >= 70) statut = "a_verifier";
  else statut = "en_attente";

  const analysis = await prisma.aiDocumentAnalysis.create({
    data: {
      contactId,
      documentUrl,
      documentNom: documentNom || "document",
      typeDetecte: (parsed.type as string) || null,
      nomDetecte: (parsed.nom_titulaire as string) || null,
      dateEmission: parsed.date_emission ? new Date(parsed.date_emission as string) : null,
      dateExpiration: parsed.date_expiration ? new Date(parsed.date_expiration as string) : null,
      scoreConfiance: score,
      donneesExtraites: JSON.stringify(parsed),
      statut,
    },
  });

  return NextResponse.json(analysis, { status: 201 });
});

// GET /api/ai/document-analysis?contactId=xxx&statut=xxx
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const statut = searchParams.get("statut");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (contactId) where.contactId = contactId;
  if (statut) where.statut = statut;

  const analyses = await prisma.aiDocumentAnalysis.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { contact: { select: { id: true, nom: true, prenom: true } } },
  });

  return NextResponse.json(analyses);
});
