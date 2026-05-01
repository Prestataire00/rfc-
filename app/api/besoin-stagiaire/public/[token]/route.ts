export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinStagiaireReponseSchema } from "@/lib/validations/besoin-stagiaire";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { token: string } }) => {
  const fiche = await prisma.besoinStagiaire.findUnique({
    where: { tokenAcces: params.token },
    include: {
      session: {
        select: {
          id: true,
          dateDebut: true,
          dateFin: true,
          formation: { select: { titre: true, categorie: true } },
        },
      },
      contact: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          dateNaissance: true,
          numeroSecuriteSociale: true,
          numeroPasseportPrevention: true,
          niveauFormation: true,
        },
      },
    },
  });
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });

  // Masquer partiellement le numero de secu (ne revelons pas ce qui est en base pour un non-authentifie)
  if (fiche.contact?.numeroSecuriteSociale) {
    fiche.contact.numeroSecuriteSociale = "••••••••••••" + fiche.contact.numeroSecuriteSociale.slice(-3);
  }
  return NextResponse.json(fiche);
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const fiche = await prisma.besoinStagiaire.findUnique({ where: { tokenAcces: params.token } });
  // Early returns explicites preserves : codes 4xx publics.
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (fiche.statut === "repondu") {
    return NextResponse.json({ error: "Fiche deja soumise" }, { status: 409 });
  }

  const d = await parseBody(req, besoinStagiaireReponseSchema);

  // MAJ contact si donnees legales fournies (date naissance, n° secu, passeport prevention)
  const contactUpdate: Record<string, unknown> = {};
  if (d.dateNaissance) {
    const date = new Date(d.dateNaissance);
    if (!isNaN(date.getTime())) contactUpdate.dateNaissance = date;
  }
  if (d.numeroSecuriteSociale && !d.numeroSecuriteSociale.startsWith("•")) {
    contactUpdate.numeroSecuriteSociale = d.numeroSecuriteSociale.replace(/\s/g, "");
  }
  if (d.numeroPasseportPrevention) contactUpdate.numeroPasseportPrevention = d.numeroPasseportPrevention;
  if (d.niveauFormation) contactUpdate.niveauFormation = d.niveauFormation;
  if (d.estRQTH || d.detailsRQTH) {
    const details = [d.estRQTH ? "RQTH: oui" : null, d.detailsRQTH, d.contraintesPhysiques, d.contraintesLangue]
      .filter(Boolean).join(" | ");
    if (details) contactUpdate.besoinsAdaptation = details;
  }

  // Atomique : MAJ contact + MAJ besoinStagiaire dans la meme transaction.
  // Eviter qu'un crash entre les deux laisse un contact partiellement mis a jour.
  await prisma.$transaction(async (tx) => {
    if (Object.keys(contactUpdate).length > 0) {
      await tx.contact.update({ where: { id: fiche.contactId }, data: contactUpdate });
    }
    await tx.besoinStagiaire.update({
      where: { id: fiche.id },
      data: {
        numeroPasseportPrevention: d.numeroPasseportPrevention ?? null,
        dejaSuivi: d.dejaSuivi,
        dateDerniereFormation: d.dateDerniereFormation ? new Date(d.dateDerniereFormation) : null,
        niveauFormation: d.niveauFormation ?? null,
        niveauPrerequis: d.niveauPrerequis ?? null,
        estRQTH: d.estRQTH,
        detailsRQTH: d.detailsRQTH ?? null,
        contraintesPhysiques: d.contraintesPhysiques ?? null,
        contraintesLangue: d.contraintesLangue ?? null,
        contraintesAlimentaires: d.contraintesAlimentaires ?? null,
        consentementRGPD: d.consentementRGPD,
        consentementBPF: d.consentementBPF,
        statut: "repondu",
        dateReponse: new Date(),
      },
    });
  });

  return NextResponse.json({ success: true });
});
