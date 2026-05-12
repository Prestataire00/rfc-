// Spec §"Phase 4 — Finalisation". Endpoint public (pas d'auth NextAuth).
// Rate-limit : 3 POST/min/IP via SignatureTokenAttempt.
// Transaction Prisma : remplit zones, hash buffer signé, appelle TSA, génère certif,
// append event signed/completed, update SignatureRequest.statut.
// Sprint 4 (capture + retour 200 sans finalisation) puis sprint 5 (finalisation crypto).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "Not implemented (sprint 4)" }, { status: 501 });
}
