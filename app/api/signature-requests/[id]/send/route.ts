// Spec §"Phase 1" (action "Clic Envoyer") + §"Phase 2 — Token & envoi email".
// Sprint 3 : génère token HMAC, hashe pour BD, envoie email avec lien magique,
// passe statut ready→sent, append events zones_placed + sent.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "Not implemented (sprint 3)" }, { status: 501 });
}
