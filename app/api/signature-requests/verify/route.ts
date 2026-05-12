// Spec §"Phase 5 — Distribution" : page /verify publique pour vérifier un PDF signé.
// POST avec PDF en multipart → recalcule SHA-256, cherche dans BD, vérifie chaîne et TSA.
// Sprint 6 : utilisé par la page publique /verify.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
}
