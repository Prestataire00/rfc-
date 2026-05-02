export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, ficheBesoinStagiaireEmail } from "@/lib/email";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const fiche = await prisma.besoinStagiaire.findUnique({
    where: { id: params.id },
    include: { contact: true, session: { include: { formation: true } } },
  });
  if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(fiche);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.besoinStagiaire.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});

// Pas de prisma.$transaction : sendEmail produit un effet de bord externe non-rollbackable.
export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { action } = await req.json().catch(() => ({ action: "" }));
  if (action === "envoyer") {
    const fiche = await prisma.besoinStagiaire.findUnique({
      where: { id: params.id },
      include: { contact: true, session: { include: { formation: true } } },
    });
    if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (!fiche.contact.email) return NextResponse.json({ error: "Email stagiaire manquant" }, { status: 400 });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/fiche-besoin-stagiaire/${fiche.tokenAcces}`;
    const email = ficheBesoinStagiaireEmail({
      stagiaire: { prenom: fiche.contact.prenom, nom: fiche.contact.nom },
      formation: { titre: fiche.session.formation.titre },
      session: { dateDebut: fiche.session.dateDebut.toISOString() },
      link,
      optionnel: fiche.optionnel,
    });
    await sendEmail({ to: fiche.contact.email, subject: email.subject, html: email.html });

    const updated = await prisma.besoinStagiaire.update({
      where: { id: params.id },
      data: { statut: fiche.statut === "en_attente" ? "envoye" : fiche.statut, dateEnvoi: new Date() },
    });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
});
