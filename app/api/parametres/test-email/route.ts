import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { to } = await req.json();

  if (!to) {
    return NextResponse.json({ success: false, message: "Email requis" }, { status: 400 });
  }

  if (!process.env.SMTP_USER) {
    return NextResponse.json({
      success: false,
      message: "SMTP non configuré. Ajoutez SMTP_USER et SMTP_PASS dans .env",
    });
  }

  try {
    await sendEmail({
      to,
      subject: "FormaPro - Test email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">FormaPro</h1>
            <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Email de test</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Cet email confirme que votre configuration SMTP fonctionne correctement.</p>
            <p style="color: #22c55e; font-weight: bold;">La configuration est opérationnelle !</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
              Envoyé depuis FormaPro CRM
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "Email envoyé avec succès !" });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || "Erreur lors de l'envoi",
    });
  }
}
