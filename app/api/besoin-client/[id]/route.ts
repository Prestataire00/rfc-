export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinClientReponseSchema } from "@/lib/validations/besoin-client";
import { sendEmail, ficheBesoinClientEmail } from "@/lib/email";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const fiche = await prisma.besoinClient.findUnique({
      where: { id: params.id },
      include: { session: { include: { formation: true } }, entreprise: true },
    });
    if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(fiche);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = besoinClientReponseSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const fiche = await prisma.besoinClient.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(fiche);
  } catch {
    return NextResponse.json({ error: "Erreur mise a jour" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.besoinClient.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}

// Action: envoyer par email (reinjecte si deja envoye)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { action } = await req.json().catch(() => ({ action: "" }));
    if (action === "envoyer") {
      const fiche = await prisma.besoinClient.findUnique({
        where: { id: params.id },
        include: { session: { include: { formation: true } }, entreprise: true },
      });
      if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      if (!fiche.destinataireEmail) return NextResponse.json({ error: "Email destinataire manquant" }, { status: 400 });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const link = `${baseUrl}/fiche-besoin-client/${fiche.tokenAcces}`;
      const email = ficheBesoinClientEmail({
        destinataireNom: fiche.destinataireNom || fiche.entreprise?.nom || "",
        entreprise: { nom: fiche.entreprise?.nom || "" },
        formation: { titre: fiche.session.formation.titre },
        session: { dateDebut: fiche.session.dateDebut.toISOString() },
        link,
        optionnel: fiche.optionnel,
      });
      await sendEmail({ to: fiche.destinataireEmail, subject: email.subject, html: email.html });

      const updated = await prisma.besoinClient.update({
        where: { id: params.id },
        data: { statut: fiche.statut === "en_attente" ? "envoye" : fiche.statut, dateEnvoi: new Date() },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err: unknown) {
    console.error("PATCH besoin-client error:", err);
    return NextResponse.json({ error: "Erreur action" }, { status: 500 });
  }
}
