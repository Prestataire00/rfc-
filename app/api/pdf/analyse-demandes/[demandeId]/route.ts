export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { analyseBesoinsPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const GET = withErrorHandlerParams<{ demandeId: string }>(
  async (_req: NextRequest, { params }) => {
    const [besoin, parametres] = await Promise.all([
      prisma.demande.findUnique({
        where: { id: params.demandeId },
        include: {
          entreprise: true,
          formation: true,
          contact: true,
        },
      }),
      getParametres(),
    ]);

    if (!besoin) {
      return NextResponse.json({ error: "Besoin introuvable" }, { status: 404 });
    }

    let materielSurPlace: string[] = [];
    try {
      const parsed = JSON.parse(besoin.materielSurPlace || "[]");
      if (Array.isArray(parsed)) materielSurPlace = parsed.filter((x) => typeof x === "string");
    } catch {
      materielSurPlace = [];
    }

    const branding = await resolveBranding(parametres);

    const docDef = analyseBesoinsPdf({
      besoin: {
        titre: besoin.titre,
        description: besoin.description,
        createdAt: besoin.createdAt.toISOString(),
        sourceContact: besoin.sourceContact,
        nbStagiaires: besoin.nbStagiaires,
        datesSouhaitees: besoin.datesSouhaitees,
        budget: besoin.budget,
        materielSurPlace,
        observation: besoin.observation,
        notes: besoin.notes,
      },
      entreprise: besoin.entreprise
        ? {
            nom: besoin.entreprise.nom,
            secteur: besoin.entreprise.secteur,
            effectif: besoin.entreprise.effectif,
            adresse: besoin.entreprise.adresse,
            codePostal: besoin.entreprise.codePostal,
            ville: besoin.entreprise.ville,
          }
        : null,
      formation: besoin.formation
        ? {
            titre: besoin.formation.titre,
            tarif: besoin.formation.tarif,
            duree: besoin.formation.duree,
            certifiante: besoin.formation.certifiante,
          }
        : null,
      contact: besoin.contact
        ? {
            nom: besoin.contact.nom,
            prenom: besoin.contact.prenom,
            email: besoin.contact.email,
            telephone: besoin.contact.telephone,
          }
        : null,
      dateGeneration: format(new Date(), "dd/MM/yyyy", { locale: fr }),
    }, { branding });

    const buffer = await generatePdfBuffer(docDef);
    const safeTitre = (besoin.titre || "besoin").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="analyse-demande-${safeTitre}.pdf"`,
      },
    });
  }
);
