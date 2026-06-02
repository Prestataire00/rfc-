// GET /api/pdf/certificat-realisation/[sessionId]/[contactId]
// Téléchargement du PDF certificat de réalisation pour un stagiaire donné.
// Réutilise certificatRealisationPdf (mêmes données que l'envoi auto/manuel).
//
// Le bouton "Cert." sur /sessions/[id] télécharge via cette route.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { pdfResponse } from "@/lib/pdf/response";
import { certificatRealisationPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const GET = withErrorHandlerParams<{ sessionId: string; contactId: string }>(
  async (_req: NextRequest, { params }) => {
    const [session, contact, parametres] = await Promise.all([
      prisma.session.findUnique({
        where: { id: params.sessionId },
        include: { formation: true },
      }),
      prisma.contact.findUnique({
        where: { id: params.contactId },
        include: { entreprise: { select: { nom: true } } },
      }),
      getParametres(),
    ]);

    if (!session || !contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const representantNom = parametres.representantNom
      || parametres.nomEntreprise.replace(/^RFC\s*-?\s*/i, "");
    const dateAction = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
    const dateSignature = format(new Date(), "dd/MM/yyyy", { locale: fr });

    const branding = await resolveBranding(parametres);
    const docDef = certificatRealisationPdf(
      {
        representant: {
          nom: representantNom,
          prenom: parametres.representantPrenom || "",
          qualite: parametres.representantQualite || "Représentant légal",
        },
        organisme: {
          nom: parametres.nomEntreprise,
          siret: parametres.siret || undefined,
          nda: parametres.nda || undefined,
        },
        stagiaire: { nom: contact.nom, prenom: contact.prenom },
        entrepriseSalarie: contact.entreprise
          ? { nom: contact.entreprise.nom }
          : undefined,
        formation: {
          titre: session.formation.titre,
          duree: session.formation.duree,
        },
        dateAction,
        natureAction: "formation",
        lieuSignature: parametres.ville || "—",
        dateSignature,
      },
      { branding },
    );

    const buffer = await generatePdfBuffer(docDef);
    return pdfResponse(
      Buffer.from(buffer),
      `certificat-realisation-${contact.prenom}-${contact.nom}`,
      "attachment",
    );
  },
);
