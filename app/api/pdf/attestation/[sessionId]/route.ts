export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { pdfResponse } from "@/lib/pdf/response";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { attestationDocDef } from "@/lib/automations/auto-attestation";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const GET = withErrorHandlerParams<{ sessionId: string }>(async (_req: NextRequest, { params }) => {
  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: {
      formation: true,
      formateur: true,
      inscriptions: {
        where: { statut: { in: ["presente", "confirmee"] } },
        include: { contact: { include: { entreprise: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
  }

  if (session.inscriptions.length === 0) {
    return NextResponse.json({ error: "Aucun stagiaire présent" }, { status: 404 });
  }

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });

  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);

  // Build combined content: each attestation content + pageBreak before (except first)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const combinedContent: any[] = [];

  for (let index = 0; index < session.inscriptions.length; index++) {
    const inscription = session.inscriptions[index];
    const { contact } = inscription;
    const template = await renderDocumentTemplate("attestation", {
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

    const doc = attestationDocDef(
      { contact, formation: session.formation, session, formateur: session.formateur, parametres },
      { branding, template: template || undefined },
    );

    if (index > 0) {
      const content = [...doc.content] as any[];
      if (content.length > 0) {
        content[0] = { ...content[0], pageBreak: "before" };
      }
      combinedContent.push(...content);
    } else {
      combinedContent.push(...doc.content);
    }
  }

  // Reprend marges / police / pied de page du gabarit (une attestation vide).
  const gabarit = attestationDocDef(
    {
      contact: { nom: "", prenom: "" },
      formation: session.formation,
      session,
      formateur: session.formateur,
      parametres,
    },
    { branding },
  );

  const docDef = {
    content: combinedContent,
    pageMargins: gabarit.pageMargins,
    footer: gabarit.footer,
    defaultStyle: gabarit.defaultStyle,
  };

  const buffer = await generatePdfBuffer(docDef);

  const slug = session.formation.titre.replace(/\s+/g, "-").toLowerCase().slice(0, 30);

  return pdfResponse(Buffer.from(buffer), `attestations-${slug}`, "attachment");
});
