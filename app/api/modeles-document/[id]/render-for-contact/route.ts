// POST /api/modeles-document/[id]/render-for-contact
//
// Genere un PDF d'un modele IA en substituant les variables {{xxx}} avec
// les vraies donnees d'un contact (et son entreprise le cas echeant).
//
// Body : { contactId: string, customVars?: Record<string, string> }
//
// Variables substituees automatiquement :
//   - {{entreprise.*}}    parametres de l'organisation (NDA, SIRET, etc.)
//   - {{client.*}}        donnees du contact (prenom, nom, email, poste...)
//   - {{stagiaire.*}}     alias de {{client.*}} pour compat
//   - {{contact.*}}       alias de {{client.*}}
//   - {{societe.*}}       donnees de l'entreprise du contact (nom, adresse, siret)
//   - {{date.aujourdhui}} date du jour formatee FR
//
// customVars : overrides supplementaires (cles libres pour les besoins
// du modele : montants, dates particulieres, etc.).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { documentLibrePdf } from "@/lib/pdf/document-libre";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { pdfResponse } from "@/lib/pdf/response";
import { resolveBranding } from "@/lib/pdf/branding";
import { getParametres } from "@/lib/parametres";
import { applyVariables } from "@/lib/message-templates";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";
}

export const POST = withErrorHandlerParams<{ id: string }>(
  async (req: NextRequest, { params }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      contactId?: string;
      customVars?: Record<string, string>;
    };

    if (!body.contactId) {
      return NextResponse.json({ error: "contactId requis" }, { status: 400 });
    }

    const [modele, contact, parametres] = await Promise.all([
      prisma.modeleDocumentIA.findUnique({ where: { id: params.id } }),
      prisma.contact.findUnique({
        where: { id: body.contactId },
        include: { entreprise: true },
      }),
      getParametres(),
    ]);

    if (!modele) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    if (!contact) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

    const branding = await resolveBranding(parametres);

    // Construit le contexte de substitution. Les alias stagiaire/contact
    // pointent sur les mêmes données — laisse le rédacteur du modèle libre
    // d'écrire {{stagiaire.prenom}} ou {{contact.prenom}}.
    const clientVars = {
      prenom: contact.prenom,
      nom: contact.nom,
      email: contact.email,
      telephone: contact.telephone ?? "",
      poste: contact.poste ?? "",
    };
    const societeVars = contact.entreprise
      ? {
          nom: contact.entreprise.nom,
          adresse: contact.entreprise.adresse ?? "",
          codePostal: contact.entreprise.codePostal ?? "",
          ville: contact.entreprise.ville ?? "",
          siret: contact.entreprise.siret ?? "",
        }
      : {};

    const vars: Record<string, unknown> = {
      entreprise: {
        nomEntreprise: parametres.nomEntreprise,
        adresse: parametres.adresse,
        codePostal: parametres.codePostal,
        ville: parametres.ville,
        telephone: parametres.telephone,
        email: parametres.email,
        siret: parametres.siret,
        nda: parametres.nda,
        tvaIntracom: parametres.tvaIntracom,
      },
      client: clientVars,
      stagiaire: clientVars,
      contact: clientVars,
      societe: societeVars,
      date: {
        aujourdhui: new Date().toLocaleDateString("fr-FR"),
      },
      ...(body.customVars ?? {}),
    };

    const fill = (text: string | null): string => {
      if (!text) return "";
      return applyVariables(text, vars);
    };

    const docDef = documentLibrePdf(
      {
        titre: fill(modele.titre),
        introduction: fill(modele.introduction),
        corps: fill(modele.corps),
        mentions: fill(modele.mentions),
      },
      { branding },
    );

    const buffer = await generatePdfBuffer(docDef);
    const nomClient = `${contact.prenom}-${contact.nom}`;
    return pdfResponse(Buffer.from(buffer), `${slugify(modele.nom)}-${slugify(nomClient)}`);
  },
);
