export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/campaigns/unsubscribe?email=xxx
// Lien de desinscription RGPD dans les emails marketing.
// Public — pas d'authentification.
export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return new NextResponse("Email requis", { status: 400 });

    await prisma.marketingOptOut.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), reason: "opt-out volontaire" },
      update: {},
    });

    // Mettre a jour le contact aussi
    await prisma.contact.updateMany({
      where: { email: { equals: email, mode: "insensitive" } },
      data: { optOutMarketing: true },
    });

    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Desinscription</title></head>
      <body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#111827;color:#e5e7eb;">
        <div style="text-align:center;max-width:400px;padding:40px;">
          <h1 style="color:#dc2626;font-size:24px;">Desinscription confirmee</h1>
          <p>Vous ne recevrez plus de communications marketing de notre part.</p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">RFC - Rescue Formation Conseil</p>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err) {
    console.error("Unsubscribe:", err);
    return new NextResponse("Erreur", { status: 500 });
  }
}
