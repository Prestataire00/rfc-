export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { attestationPdf } from "@/lib/pdf/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
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

    // Build combined content: each attestation content + pageBreak before (except first)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combinedContent: any[] = [];

    session.inscriptions.forEach((inscription, index) => {
      const { contact } = inscription;
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
      });

      if (index > 0) {
        // Mark first element of this attestation with a page break
        const content = [...doc.content] as any[];
        if (content.length > 0) {
          content[0] = { ...content[0], pageBreak: "before" };
        }
        combinedContent.push(...content);
      } else {
        combinedContent.push(...doc.content);
      }
    });

    // Use styles from the first attestation (all are identical)
    const firstDoc = attestationPdf({
      stagiaire: { nom: "", prenom: "" },
      formation: { titre: session.formation.titre, duree: session.formation.duree },
      session: { dateDebut, dateFin },
      dateGeneration,
    });

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
  } catch (err: unknown) {
    console.error("Erreur génération attestations PDF:", err);
    return NextResponse.json({ error: "Erreur lors de la génération des attestations" }, { status: 500 });
  }
}
