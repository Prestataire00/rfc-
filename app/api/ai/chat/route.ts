export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkAIKey, streamClaude, cleanAIResponse, askClaude } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

type ChatMessage = { role: "user" | "assistant"; content: string };

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const aiChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "Aucun message"),
  stream: z.boolean().optional(),
});

function buildSystemPrompt(stats: {
  contacts: number; formations: number; sessions: number; devis: number; factures: number; besoins: number;
}): string {
  return `Tu es l'assistant conversationnel du CRM RFC, une plateforme de gestion pour un organisme de formation professionnelle specialise dans la securite, l'incendie, les premiers secours et les habilitations electriques.

Ton role est d'aider les utilisateurs a naviguer dans le CRM, a comprendre ses fonctionnalites, et a accomplir leurs taches plus vite. Tu reponds en francais, de maniere concise et pragmatique, en 3 a 5 phrases maximum pour une question simple.

La partie CRM permet de gerer les contacts a /contacts, les entreprises a /entreprises, les demandes a /demandes. La partie pedagogique regroupe les formations a /formations, les sessions a /sessions, les formateurs a /formateurs. La partie commerciale se trouve a /commercial pour devis et factures. La qualite couvre /evaluations (questionnaires de satisfaction), /qualiopi/fiches-pre-formation (fiches Qualiopi pre-formation), /certifications et /qualiopi pour les indicateurs. L'administration est a /parametres et /parametres/automations-v2.

Donnees actuelles : ${stats.contacts} contacts, ${stats.formations} formations, ${stats.sessions} sessions, ${stats.devis} devis, ${stats.factures} factures et ${stats.besoins} demandes.

Tu ecris en prose normale, jamais de dieses, jamais d'etoiles, jamais de tirets en debut de ligne. Tu es chaleureux et professionnel.`;
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) {
    return new Response(JSON.stringify({ error: "Cle Anthropic manquante" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const raw = await req.json().catch(() => null);
  const parsed = aiChatSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Validation échouée",
        issues: parsed.error.flatten().fieldErrors,
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }
  const { messages, stream: shouldStream } = parsed.data as { messages: ChatMessage[]; stream?: boolean };

  const [contacts, formations, sessions, devis, factures, besoins] = await Promise.all([
    prisma.contact.count().catch(() => 0), prisma.formation.count().catch(() => 0),
    prisma.session.count().catch(() => 0), prisma.devis.count().catch(() => 0),
    prisma.facture.count().catch(() => 0), prisma.demande.count().catch(() => 0),
  ]);

  const systemPrompt = buildSystemPrompt({ contacts, formations, sessions, devis, factures, besoins });

  if (shouldStream) {
    const encoder = new TextEncoder();
    // Audit §P2 : timeout serveur sur le stream SSE. Sans borne, une connexion
    // longue (ou un upstream qui ne se termine jamais) reste ouverte
    // indéfiniment → risque DoS. Au-delà de 60s on abort l'appel SDK underlying
    // et on ferme proprement le stream. Le timer est annulé dès que le cas
    // nominal se termine, pour ne pas pénaliser les réponses courtes.
    const STREAM_TIMEOUT_MS = 60_000;
    const stream = new ReadableStream({
      async start(controller) {
        let timedOut = false;
        let claudeStream: Awaited<ReturnType<typeof streamClaude>> | undefined;
        const timeout = setTimeout(() => {
          timedOut = true;
          logger.warn("ai.chat.stream_timeout", { timeoutMs: STREAM_TIMEOUT_MS });
          // Interrompt la requête HTTP underlying vers Anthropic.
          try {
            claudeStream?.abort();
          } catch {
            /* abort best-effort */
          }
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Délai dépassé" })}\n\n`));
            controller.close();
          } catch {
            /* stream déjà fermé */
          }
        }, STREAM_TIMEOUT_MS);
        try {
          claudeStream = await streamClaude(messages, systemPrompt);
          let buffer = "";
          for await (const event of claudeStream) {
            if (timedOut) break;
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              buffer += event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanAIResponse(buffer) })}\n\n`));
            }
          }
          if (!timedOut) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        } catch (err) {
          // SSE error reporting : on enqueue un message d'erreur structure plutot que throw
          // (le throw casserait le stream sans atteindre le client).
          // Si le timeout a déjà fermé le stream, on ne ré-enqueue rien.
          if (!timedOut) {
            logger.error("ai.chat.stream_failed", err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Erreur" })}\n\n`));
            controller.close();
          }
        } finally {
          clearTimeout(timeout);
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  }

  const text = await askClaude(`${systemPrompt}\n\n${messages.map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"} : ${m.content}`).join("\n")}`, 1500);
  return new Response(JSON.stringify({ text }), { headers: { "Content-Type": "application/json" } });
});
