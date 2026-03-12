import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { convocationPdf } from "@/lib/pdf/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string; contactId: string } }
) {
  const [session, contact] = await Promise.all([
    prisma.session.findUnique({
      where: { id: params.sessionId },
      include: { formation: true, formateur: true },
    }),
    prisma.contact.findUnique({ where: { id: params.contactId } }),
  ]);

  if (!session || !contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const docDef = convocationPdf({
    stagiaire: { nom: contact.nom, prenom: contact.prenom, email: contact.email },
    formation: {
      titre: session.formation.titre,
      duree: session.formation.duree,
    },
    session: {
      dateDebut: format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr }),
      dateFin: format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr }),
      lieu: session.lieu || undefined,
    },
    formateur: session.formateur
      ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
      : undefined,
  });

  const buffer = await generatePdfBuffer(docDef);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="convocation-${contact.prenom}-${contact.nom}.pdf"`,
    },
  });
}
