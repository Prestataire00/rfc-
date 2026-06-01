export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fichePreFormationEntrepriseReponseSchema } from "@/lib/validations/fiche-pre-formation-entreprise";
import { sendEmail, fichePreFormationEntrepriseEmail } from "@/lib/email";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const fiche = await prisma.fichePreFormationEntreprise.findUnique({
    where: { id: params.id },
    include: { session: { include: { formation: true } }, entreprise: true },
  });
  if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(fiche);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const data = await parsePartialBody(req, fichePreFormationEntrepriseReponseSchema);
  const fiche = await prisma.fichePreFormationEntreprise.update({ where: { id: params.id }, data });
  return NextResponse.json(fiche);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.fichePreFormationEntreprise.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});

// Action: envoyer par email (reinjecte si deja envoye)
// Pas de prisma.$transaction : sendEmail produit un effet de bord externe non-rollbackable.
export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { action } = await req.json().catch(() => ({ action: "" }));
  if (action === "envoyer") {
    const fiche = await prisma.fichePreFormationEntreprise.findUnique({
      where: { id: params.id },
      include: {
        session: { include: { formation: true } },
        formation: true, // fallback pour fiches créées pré-session
        entreprise: true,
      },
    });
    if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (!fiche.destinataireEmail) return NextResponse.json({ error: "Email destinataire manquant" }, { status: 400 });

    const formation = fiche.session?.formation ?? fiche.formation;
    if (!formation) {
      return NextResponse.json({ error: "Aucune formation rattachée à la fiche" }, { status: 422 });
    }
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/qualiopi/fiche-entreprise/${fiche.tokenAcces}`;
    const email = fichePreFormationEntrepriseEmail({
      destinataireNom: fiche.destinataireNom || fiche.entreprise?.nom || "",
      entreprise: { nom: fiche.entreprise?.nom || "" },
      formation: { titre: formation.titre },
      session: fiche.session ? { dateDebut: fiche.session.dateDebut.toISOString() } : null,
      link,
      optionnel: fiche.optionnel,
    });
    await sendEmail({ to: fiche.destinataireEmail, subject: email.subject, html: email.html });

    const updated = await prisma.fichePreFormationEntreprise.update({
      where: { id: params.id },
      data: { statut: fiche.statut === "en_attente" ? "envoye" : fiche.statut, dateEnvoi: new Date() },
    });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
});
