export const dynamic = "force-dynamic";

// GET /api/pdf/modele-document/[id]
// Genere le PDF d'un modele de document IA, brande avec le logo / la couleur
// de l'entreprise. Les variables {{entreprise.*}} sont remplies depuis les
// parametres ; les autres variables {{...}} restent telles quelles (modele).

import { NextRequest, NextResponse } from "next/server";
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
    .slice(0, 60) || "modele";
}

export const GET = withErrorHandlerParams<{ id: string }>(
  async (_req: NextRequest, { params }) => {
    const modele = await prisma.modeleDocumentIA.findUnique({
      where: { id: params.id },
    });
    if (!modele) {
      return NextResponse.json({ error: "Modele introuvable" }, { status: 404 });
    }

    const parametres = await getParametres();
    const branding = await resolveBranding(parametres);

    // On remplit uniquement les variables {{entreprise.*}} : un modele est
    // generique, les autres variables (contact, session...) restent visibles.
    const vars = {
      entreprise: {
        nomEntreprise: parametres.nomEntreprise,
        adresse: parametres.adresse,
        codePostal: parametres.codePostal,
        ville: parametres.ville,
        telephone: parametres.telephone,
        email: parametres.email,
        siteWeb: parametres.siteWeb,
        siret: parametres.siret,
        nda: parametres.nda,
        tvaIntracom: parametres.tvaIntracom,
      },
    };

    // applyVariables remplace {{xxx}} mais renvoie "" pour les cles inconnues :
    // on ne traite donc QUE le prefixe entreprise pour preserver les autres.
    const fill = (text: string | null): string => {
      if (!text) return "";
      return text.replace(/\{\{\s*entreprise\.[a-zA-Z0-9_]+\s*\}\}/g, (m) =>
        applyVariables(m, vars),
      );
    };

    const docDef = documentLibrePdf(
      {
        titre: modele.titre,
        introduction: fill(modele.introduction),
        corps: fill(modele.corps),
        mentions: fill(modele.mentions),
      },
      { branding },
    );

    const buffer = await generatePdfBuffer(docDef);
    return pdfResponse(Buffer.from(buffer), `modele-${slugify(modele.nom)}`);
  },
);
