export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAIKey, streamClaude, cleanAIResponse, askClaude } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";

type ChatMessage = { role: "user" | "assistant"; content: string };

function buildSystemPrompt(stats: {
  contacts: number; formations: number; sessions: number; devis: number; factures: number; besoins: number;
}): string {
  return `Tu es l'assistant conversationnel du CRM RFC, une plateforme de gestion pour un organisme de formation professionnelle specialise dans la securite, l'incendie, les premiers secours et les habilitations electriques.

Ton role est d'aider les utilisateurs a naviguer dans le CRM, a comprendre ses fonctionnalites, et a accomplir leurs taches plus vite. Tu reponds en francais, de maniere concise et pragmatique, en 3 a 5 phrases maximum pour une question simple.

La partie CRM permet de gerer les contacts a /contacts, les entreprises a /entreprises, les besoins a /besoins. La partie pedagogique regroupe les formations a /formations, les sessions a /sessions, les formateurs a /formateurs. La partie commerciale se trouve a /commercial pour devis et factures. La qualite couvre /evaluations et /qualiopi. L'administration est a /parametres et /parametres/automations-v2.

Donnees actuelles : ${stats.contacts} contacts, ${stats.formations} formations, ${stats.sessions} sessions, ${stats.devis} devis, ${stats.factures} factures et ${stats.besoins} besoins.

Tu ecris en prose normale, jamais de dieses, jamais d'etoiles, jamais de tirets en debut de ligne. Tu es chaleureux et professionnel.`;
}

export async function POST(req: NextRequest) {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) {
    return new Response(JSON.stringify({ error: "Cle Anthropic manquante" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json();
    const { messages, stream: shouldStream } = body as { messages: ChatMessage[]; stream?: boolean };

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "Aucun message" }), { status: 400 });
    }

    const [contacts, formations, sessions, devis, factures, besoins] = await Promise.all([
      prisma.contact.count().catch(() => 0), prisma.formation.count().catch(() => 0),
      prisma.session.count().catch(() => 0), prisma.devis.count().catch(() => 0),
      prisma.facture.count().catch(() => 0), prisma.besoinFormation.count().catch(() => 0),
    ]);

    const systemPrompt = buildSystemPrompt({ contacts, formations, sessions, devis, factures, besoins });

    if (shouldStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const claudeStream = await streamClaude(messages, systemPrompt);
            let buffer = "";
            for await (const event of claudeStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                buffer += event.delta.text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanAIResponse(buffer) })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            console.error("[chat] stream error", err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Erreur" })}\n\n`));
            controller.close();
          }
        },
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
    }

    const text = await askClaude(`${systemPrompt}\n\n${messages.map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"} : ${m.content}`).join("\n")}`, 1500);
    return new Response(JSON.stringify({ text }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[chat]", err);
    return new Response(JSON.stringify({ error: "Erreur" }), { status: 500 });
  }
}
