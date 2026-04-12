export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinClientReponseSchema } from "@/lib/validations/besoin-client";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
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
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const fiche = await prisma.besoinClient.findUnique({
      where: { tokenAcces: params.token },
      include: { entreprise: true },
    });
    if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    if (fiche.statut === "repondu") {
      return NextResponse.json({ error: "Fiche deja soumise" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = besoinClientReponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.besoinClient.update({
      where: { id: fiche.id },
      data: {
        ...data,
        statut: "repondu",
        dateReponse: new Date(),
      },
    });

    // Si entreprise liee et effectif renseigne → maj entreprise
    if (fiche.entrepriseId && data.effectifTotal) {
      await prisma.entreprise.update({
        where: { id: fiche.entrepriseId },
        data: {
          effectif: data.effectifTotal,
          secteur: data.secteurActivite || fiche.entreprise?.secteur || null,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, id: updated.id });
  } catch (err: unknown) {
    console.error("POST public besoin-client error:", err);
    return NextResponse.json({ error: "Erreur lors de la soumission" }, { status: 500 });
  }
}
