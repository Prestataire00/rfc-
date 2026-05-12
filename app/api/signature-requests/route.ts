// Spec: docs/superpowers/specs/2026-05-12-signature-electronique-self-hosted-design.md
// Sprint 2 : POST upload PDF (multipart) + créer SignatureRequest draft.
// Sprint 6 : GET liste paginée pour /signatures (admin).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented (sprint 2)" }, { status: 501 });
}
