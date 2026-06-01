import Anthropic from "@anthropic-ai/sdk";

// Timeout court : Netlify Functions free tier coupe à 10s. On veut échouer
// proprement à 8s avec un message d'erreur clair plutôt que voir le socket
// se fermer brutalement (qui produit le wording « socket connection was
// closed unexpectedly » côté UI). Si Claude met trop de temps, le caller
// reçoit un APIConnectionTimeoutError qu'on peut intercepter.
// maxRetries: 0 — on ne veut PAS de retry automatique qui ferait exploser
// le budget de 10s en cumulant les tentatives.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 8000,
  maxRetries: 0,
});

export const AI_MODEL = "claude-sonnet-4-6";

export function checkAIKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export const NO_MARKDOWN_INSTRUCTION = [
  "Regles de format de ta reponse :",
  "Tu reponds en francais, en phrases completes et naturelles.",
  "Tu ecris en prose. Tu n'utilises aucun formatage : pas de dieses pour des titres, pas d'etoiles pour du gras ou de l'italique, pas de tirets en debut de ligne pour des listes, pas de backticks pour du code, pas de lignes de tirets separatrices, pas de tables markdown.",
  "Si tu dois enumerer plusieurs elements, tu les integres dans la phrase avec des virgules ou tu ecris un paragraphe par element.",
  "Tu restes concis, 3 a 6 phrases par section, sauf si on te demande un document long.",
].join(" ");

// Erreur métier dédiée — permet aux routes API de catcher spécifiquement
// les soucis d'appel Claude (timeout, indisponibilité) et de retourner
// un message clair au lieu du wording brut du SDK.
export class AIUnavailableError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export async function askClaude(
  prompt: string,
  maxTokens = 1500,
  options: { noMarkdown?: boolean } = { noMarkdown: true }
): Promise<string> {
  const finalPrompt = options.noMarkdown
    ? `${NO_MARKDOWN_INSTRUCTION}\n\n${prompt}`
    : prompt;

  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: finalPrompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    return options.noMarkdown ? cleanAIResponse(raw) : raw;
  } catch (err) {
    // Timeout SDK (8s) ou socket coupé → message utilisateur clair plutôt
    // que de propager le « API Error: socket connection was closed ».
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("timeout") || msg.includes("socket") || msg.includes("aborted")) {
      throw new AIUnavailableError(
        "L'assistant IA met trop de temps à répondre (limite Netlify 10s). Réessayez dans un instant ou saisissez le texte manuellement.",
        err,
      );
    }
    throw err;
  }
}

export function cleanAIResponse(text: string): string {
  let out = text;
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/\*([^*\n]+)\*/g, "$1");
  out = out.replace(/___([^_]+)___/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/_([^_\n]+)_/g, "$1");
  out = out.replace(/```[\s\S]*?```/g, "");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/^>\s?/gm, "");
  out = out.replace(/^\s*[-*+]\s+/gm, "");
  out = out.replace(/^\s*\d+\.\s+/gm, "");
  out = out.replace(/^[-=_*]{3,}$/gm, "");
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

export async function streamClaude(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  maxTokens = 1500
) {
  return client.messages.stream({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: `${NO_MARKDOWN_INSTRUCTION}\n\n${systemPrompt}`,
    messages,
  });
}

// Analyse une image (habilitation, carte pro, diplôme, etc.) via Claude Vision.
// Retourne le texte brut renvoyé par le modèle — au caller de parser le JSON attendu.
type VisionMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export async function askClaudeVision(
  imageBase64: string,
  mediaType: VisionMediaType,
  prompt: string,
  maxTokens = 1500
): Promise<string> {
  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export function normalizeVisionMediaType(contentType: string | null): VisionMediaType {
  const ct = (contentType || "").toLowerCase();
  if (ct.startsWith("image/jpeg") || ct.startsWith("image/jpg")) return "image/jpeg";
  if (ct.startsWith("image/gif")) return "image/gif";
  if (ct.startsWith("image/webp")) return "image/webp";
  return "image/png";
}
