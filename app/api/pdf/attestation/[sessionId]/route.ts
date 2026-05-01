export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { attestationPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
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
        include: { contact: true },
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
  const dateGeneration = format(new Date(), "dd/MM/yyyy", { locale: fr });

  const formateur = session.formateur
    ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
    : undefined;

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

    const doc = attestationPdf({
      stagiaire: { nom: contact.nom, prenom: contact.prenom },
      formation: {
        titre: session.formation.titre,
        duree: session.formation.duree,
        objectifs: session.formation.objectifs || undefined,
      },
      session: { dateDebut, dateFin, lieu: session.lieu || undefined },
      formateur,
      dateGeneration,
    }, { branding, template: template || undefined });

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

  // Use styles from a first (empty) attestation
  const firstDoc = attestationPdf({
    stagiaire: { nom: "", prenom: "" },
    formation: { titre: session.formation.titre, duree: session.formation.duree },
    session: { dateDebut, dateFin },
    dateGeneration,
  }, { branding });

  const docDef = {
    content: combinedContent,
    styles: firstDoc.styles,
    defaultStyle: firstDoc.defaultStyle,
  };

  const buffer = await generatePdfBuffer(docDef);

  const slug = session.formation.titre.replace(/\s+/g, "-").toLowerCase().slice(0, 30);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attestations-${slug}.pdf"`,
    },
  });
});
