import { NextResponse } from "next/server";

export async function GET() {
  try {
    const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    return NextResponse.json({
      configured,
      host: configured ? process.env.SMTP_HOST || "smtp.gmail.com" : undefined,
    });
  } catch (err: unknown) {
    console.error("Erreur verification statut SMTP:", err);
    return NextResponse.json({ error: "Erreur lors de la verification du statut SMTP" }, { status: 500 });
  }
}
