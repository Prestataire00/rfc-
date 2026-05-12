// Cron */5 min — reprend les SignatureRequest bloquées en statut "signed" non "completed".
// Tente le retry de la finalisation Phase 4 (étapes TSA/cert) avec backoff exponentiel.
// Max 3 tentatives ; alerte admin si échec définitif.
// Spec §"Phase 4" + §"Cas d'erreur" (FreeTSA injoignable).
// Auth via Bearer CRON_SECRET — voir pattern dans app/api/cron/factures/route.ts.
// Sprint 5.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: "Not implemented (sprint 5)" }, { status: 501 });
}
