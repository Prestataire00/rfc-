// Helper pour appliquer un rate-limit en 1 ligne dans une route handler.
// Retourne une NextResponse 429 si dépassé, ou null si OK (continue).

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import type { UpstashWindow } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

type PresetConfig = { max: number; window: UpstashWindow };

/**
 * Vérifie le rate-limit pour cette requête. Retourne une 429 si bloqué, null sinon.
 *
 * @param req         La requête (pour extraire l'IP)
 * @param preset      Preset de RATE_LIMIT_PRESETS (max + window)
 * @param keyPrefix   Préfixe de namespace pour la clé Redis (ex: "public:eval", "public:inscr")
 * @param identifier  Optionnel : override de l'identifiant (par défaut = IP du client)
 *
 * @example
 *   const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:eval");
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  req: NextRequest | Request,
  preset: PresetConfig,
  keyPrefix: string,
  identifier?: string,
): Promise<NextResponse | null> {
  const id = identifier ?? getClientIp(req);
  const result = await rateLimit(`${keyPrefix}:${id}`, preset.max, preset.window);
  if (result.ok) return null;

  const retryAfterSec = Math.max(1, Math.floor((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "Trop de requêtes. Réessayez plus tard.",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(preset.max),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    },
  );
}
