// Cron quotidien 9h UTC — envoie rappels J-3 et J-1 aux signataires des
// SignatureRequest statut "sent" ou "viewed" qui n'ont pas encore signé.
// Spec §"Cas d'erreur" (Expiration → rappels). Auth Bearer CRON_SECRET.
// Sprint 6.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
}
