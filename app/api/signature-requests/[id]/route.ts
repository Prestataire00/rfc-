// Spec §"Phase 1". GET détail, PATCH (placement zones debounced), DELETE.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Not implemented (sprint 2)" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
}
