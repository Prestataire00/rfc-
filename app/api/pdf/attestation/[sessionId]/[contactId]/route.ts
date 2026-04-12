export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { attestationPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string; contactId: string } }
) {
  try {
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

    const docDef = attestationPdf({
      stagiaire: { nom: contact.nom, prenom: contact.prenom },
      formation: {
        titre: session.formation.titre,
        duree: session.formation.duree,
        objectifs: session.formation.objectifs || undefined,
      },
      session: { dateDebut, dateFin, lieu: session.lieu || undefined },
      formateur: session.formateur
        ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
        : undefined,
      dateGeneration: format(new Date(), "dd/MM/yyyy", { locale: fr }),
    }, { branding, template: template || undefined });

    const buffer = await generatePdfBuffer(docDef);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attestation-${contact.prenom}-${contact.nom}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("Erreur generation attestation PDF:", err);
    return NextResponse.json({ error: "Erreur lors de la generation de l'attestation" }, { status: 500 });
  }
}
