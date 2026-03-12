import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { conventionPdf } from "@/lib/pdf/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: {
      formation: true,
      formateur: true,
      inscriptions: {
        include: { contact: { include: { entreprise: true } } },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Find the enterprise from inscriptions or use a default
  const entreprise = session.inscriptions[0]?.contact?.entreprise;

  const docDef = conventionPdf({
    entreprise: {
      nom: entreprise?.nom || "Client",
      adresse: entreprise?.adresse || undefined,
      ville: entreprise?.ville || undefined,
      codePostal: entreprise?.codePostal || undefined,
      siret: entreprise?.siret || undefined,
    },
    formation: {
      titre: session.formation.titre,
      duree: session.formation.duree,
      objectifs: session.formation.objectifs || undefined,
    },
    session: {
      dateDebut: format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr }),
      dateFin: format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr }),
      lieu: session.lieu || undefined,
    },
    montantHT: session.formation.tarif,
    montantTTC: session.formation.tarif * 1.2,
    numero: `CONV-${format(new Date(session.dateDebut), "yyyy")}-${session.id.slice(-4).toUpperCase()}`,
  });

  const buffer = await generatePdfBuffer(docDef);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="convention-${session.id}.pdf"`,
    },
  });
}
