// Spec §"Cas d'erreur" — signataire refuse. POST avec declineReason.
// Statut Signataire passe à declined, SignatureRequest passe à rejected.
// Sprint 4.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "Not implemented (sprint 4)" }, { status: 501 });
}
