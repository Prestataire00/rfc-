// Spec §"SignatureEvent" → vérification de chaîne. Utilise lib/signatures/audit-chain.ts.
// Sprint 6 : exposition admin pour vérifier que la chaîne n'a pas été modifiée.
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const dynamic = "force-dynamic";

export const GET = withErrorHandlerParams<{ id: string }>(async (_req: NextRequest) => {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
});
