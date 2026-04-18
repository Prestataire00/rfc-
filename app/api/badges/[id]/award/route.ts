export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// POST /api/badges/[id]/award — attribuer le badge a un ou plusieurs contacts
// Body: { contactIds: string[], sessionId?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { contactIds, sessionId } = await req.json();
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "contactIds requis" }, { status: 400 });
    }

    const badge = await prisma.digitalBadge.findUnique({ where: { id: params.id } });
    if (!badge) return NextResponse.json({ error: "Badge introuvable" }, { status: 404 });

    const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";
    const results: { contactId: string; status: string }[] = [];

    for (const contactId of contactIds) {
      const existing = await prisma.badgeAward.findUnique({
        where: { badgeId_contactId: { badgeId: params.id, contactId } },
      });
      if (existing && !existing.revoque) {
        results.push({ contactId, status: "already_awarded" });
        continue;
      }

      const award = existing
        ? await prisma.badgeAward.update({
            where: { id: existing.id },
            data: { revoque: false, revoqueAt: null, revoqueRaison: null, sessionId: sessionId || null },
          })
        : await prisma.badgeAward.create({
            data: { badgeId: params.id, contactId, sessionId: sessionId || null },
          });

      // Envoyer email de notification
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (contact?.email) {
        const verifyUrl = `${baseUrl}/badges/${award.verificationToken}`;
        const linkedinUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(badge.nom)}&organizationName=${encodeURIComponent("RFC - Rescue Formation Conseil")}&certUrl=${encodeURIComponent(verifyUrl)}`;

        await sendEmail({
          to: contact.email,
          subject: `Badge obtenu : ${badge.nom}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#dc2626;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;">Felicitations !</h1>
            </div>
            <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
              <p>Bonjour <strong>${contact.prenom}</strong>,</p>
              <p>Vous avez obtenu le badge <strong>${badge.nom}</strong> (${badge.niveau}).</p>
              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;padding:16px 24px;border-radius:12px;background:${badge.couleur}20;border:2px solid ${badge.couleur};">
                  <span style="font-size:32px;">${badge.icone || "🏆"}</span>
                  <p style="margin:8px 0 0;font-weight:bold;color:${badge.couleur};">${badge.nom}</p>
                </div>
              </div>
              <p><a href="${verifyUrl}" style="color:#dc2626;">Voir mon badge</a></p>
              <p><a href="${linkedinUrl}" style="background:#0a66c2;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Ajouter a LinkedIn</a></p>
            </div>
          </div>`,
        });
      }

      results.push({ contactId, status: "awarded" });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("POST badges/[id]/award:", err);
    return NextResponse.json({ error: "Erreur attribution" }, { status: 500 });
  }
}
