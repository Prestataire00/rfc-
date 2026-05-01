export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinClientReponseSchema } from "@/lib/validations/besoin-client";
import { sendEmail, ficheBesoinClientEmail } from "@/lib/email";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const fiche = await prisma.besoinClient.findUnique({
    where: { id: params.id },
    include: { session: { include: { formation: true } }, entreprise: true },
  });
  if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(fiche);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const data = await parsePartialBody(req, besoinClientReponseSchema);
  const fiche = await prisma.besoinClient.update({ where: { id: params.id }, data });
  return NextResponse.json(fiche);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.besoinClient.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});

// Action: envoyer par email (reinjecte si deja envoye)
// Pas de prisma.$transaction : sendEmail produit un effet de bord externe non-rollbackable.
export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
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
});
