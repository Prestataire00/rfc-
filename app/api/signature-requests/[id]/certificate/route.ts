// Spec §"Phase 4 — Finalisation" étape 4 : génération certificat de preuve.
// Retourne le PDF (généré via @react-pdf/renderer) avec hashes, audit log, QR /verify.
// Sprint 5 : génération à la finalisation. Sprint 6 : exposition admin pour téléchargement.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Not implemented (sprint 5)" }, { status: 501 });
}
