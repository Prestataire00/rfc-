export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinClientReponseSchema } from "@/lib/validations/besoin-client";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { token: string } }) => {
  const fiche = await prisma.besoinClient.findUnique({
    where: { tokenAcces: params.token },
    include: {
      session: {
        select: {
          id: true,
          dateDebut: true,
          dateFin: true,
          formation: { select: { titre: true, categorie: true, duree: true } },
        },
      },
      entreprise: { select: { id: true, nom: true, secteur: true, effectif: true } },
    },
  });
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  return NextResponse.json(fiche);
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const fiche = await prisma.besoinClient.findUnique({
    where: { tokenAcces: params.token },
    include: { entreprise: true },
  });
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (fiche.statut === "repondu") {
    return NextResponse.json({ error: "Fiche deja soumise" }, { status: 409 });
  }

  const data = await parseBody(req, besoinClientReponseSchema);

  // Atomique : la fiche n'est marquée "repondu" que si la maj entreprise réussit aussi.
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.besoinClient.update({
      where: { id: fiche.id },
      data: {
        ...data,
        statut: "repondu",
        dateReponse: new Date(),
      },
    });

    if (fiche.entrepriseId && data.effectifTotal) {
      await tx.entreprise.update({
        where: { id: fiche.entrepriseId },
        data: {
          effectif: data.effectifTotal,
          secteur: data.secteurActivite || fiche.entreprise?.secteur || null,
        },
      });
    }

    return u;
  });

  return NextResponse.json({ success: true, id: updated.id });
});
