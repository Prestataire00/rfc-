// Spec §"SignatureEvent". Retourne tous les events d'une request, ordonnés.
// Sprint 6 : utilisé par /signatures/[id] côté admin pour afficher l'audit log.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
}
