// Health check public — utilisé par le monitoring uptime externe (UptimeRobot,
// Better Uptime, etc.). Pas d'auth requise (cf. middleware.ts > publicPaths).
//
// Réponse normale (200) : { status: "ok", db: "ok", uptime: <secondes> }
// Réponse dégradée (503) : { status: "degraded", db: "down", error: "..." }
//
// Performance cible : < 500 ms. Le check DB est un SELECT 1 ; pas de
// requête métier — l'endpoint doit être ultra-rapide pour ne pas être
// rate-limited côté monitoring et pour ne pas peser sur la prod.
//
// Cf. STORY-TD-009.

export const dynamic = "force-dynamic"; // jamais cached
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = process.uptime(); // depuis le boot de l'instance Netlify Function
  let dbOk = false;
  let dbError: string | undefined;
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }
  const dbLatencyMs = Date.now() - dbStart;

  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk ? "ok" : "down",
    dbLatencyMs,
    uptime: Math.round(startedAt),
    timestamp: new Date().toISOString(),
    ...(dbError ? { dbError } : {}),
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
