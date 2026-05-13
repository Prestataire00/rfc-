// Spec §"SignatureEvent" → vérification de chaîne. Utilise lib/signatures/audit-chain.ts.
// Sprint 6 : exposition admin pour vérifier que la chaîne n'a pas été modifiée.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
}
