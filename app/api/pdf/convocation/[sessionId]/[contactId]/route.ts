export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { convocationPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const GET = withErrorHandlerParams<{ sessionId: string; contactId: string }>(
  async (_req: NextRequest, { params }) => {
    const [session, contact, parametres] = await Promise.all([
      prisma.session.findUnique({
        where: { id: params.sessionId },
        include: { formation: true, formateur: true },
      }),
      prisma.contact.findUnique({ where: { id: params.contactId } }),
      getParametres(),
    ]);

    if (!session || !contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
    const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });

    const branding = await resolveBranding(parametres);
    const template = await renderDocumentTemplate("convocation", {
      stagiaire: { prenom: contact.prenom, nom: contact.nom },
      formation: { titre: session.formation.titre, duree: session.formation.duree },
      session: { dateDebut, dateFin, lieu: session.lieu || "" },
      entreprise: {
        nomEntreprise: parametres.nomEntreprise,
        adresse: parametres.adresse,
        siret: parametres.siret,
        nda: parametres.nda,
      },
    });

    const docDef = convocationPdf({
      stagiaire: { nom: contact.nom, prenom: contact.prenom, email: contact.email },
      formation: {
        titre: session.formation.titre,
        duree: session.formation.duree,
      },
      session: {
        dateDebut,
        dateFin,
        lieu: session.lieu || undefined,
      },
      formateur: session.formateur
        ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
        : undefined,
    }, { branding, template: template || undefined });

    const buffer = await generatePdfBuffer(docDef);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="convocation-${contact.prenom}-${contact.nom}.pdf"`,
      },
    });
  }
);
