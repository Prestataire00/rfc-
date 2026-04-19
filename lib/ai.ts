import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export async function askClaude(
  prompt: string,
  maxTokens = 1500,
  options: { noMarkdown?: boolean } = { noMarkdown: true }
): Promise<string> {
  const finalPrompt = options.noMarkdown
    ? `${NO_MARKDOWN_INSTRUCTION}\n\n${prompt}`
    : prompt;

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: finalPrompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  return options.noMarkdown ? cleanAIResponse(raw) : raw;
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
