// Garde commune pour toutes les routes /api/ai/.
// Centralise verification d'auth + rate limit.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

export type AIGuardResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse };

/**
 * A appeler en premiere ligne de chaque POST de route IA.
 * Rejette les non-admins et applique 30 appels par heure par utilisateur.
 */
export async function aiGuard(req: NextRequest): Promise<AIGuardResult> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acces interdit" }, { status: 403 }),
    };
  }

  const userId = String(token.sub ?? token.id ?? "anon");
  const limit = checkRateLimit(`ai:${userId}`, 30, 60 * 60 * 1000);

  if (!limit.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Trop de requetes IA. Reessayez plus tard.",
          resetAt: new Date(limit.resetAt).toISOString(),
        },
        { status: 429 }
      ),
    };
  }

  return { ok: true, userId, role: token.role as string };
}
