import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const AI_MODEL = "claude-sonnet-4-6";

export async function askClaude(prompt: string, maxTokens = 1500): Promise<string> {
  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export function checkAIKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
