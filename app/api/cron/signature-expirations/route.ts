// Cron quotidien 2h UTC — marque les SignatureRequest dont expiresAt < now et statut
// dans (sent, viewed) comme "expired". Append event "expired".
// Purge SignatureTokenAttempt > 30 jours.
// Spec §"Cas d'erreur" (Expiration). Auth Bearer CRON_SECRET.
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
