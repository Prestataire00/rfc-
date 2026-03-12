import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, convocationEmail } from "@/lib/email";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { convocationPdf } from "@/lib/pdf/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function POST(req: NextRequest) {
  const { sessionId, contactId } = await req.json();

  const [session, contact] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { formation: true, formateur: true },
    }),
    prisma.contact.findUnique({ where: { id: contactId } }),
  ]);

  if (!session || !contact) {
    return NextResponse.json({ error: "Session ou contact introuvable" }, { status: 404 });
  }

  if (!contact.email) {
    return NextResponse.json({ error: "Le contact n'a pas d'email" }, { status: 400 });
  }

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });

  // Generate PDF
  const pdfBuffer = await generatePdfBuffer(
    convocationPdf({
      stagiaire: { nom: contact.nom, prenom: contact.prenom, email: contact.email },
      formation: { titre: session.formation.titre, duree: session.formation.duree },
      session: { dateDebut, dateFin, lieu: session.lieu || undefined },
      formateur: session.formateur
        ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
        : undefined,
    })
  );

  // Send email
  const emailContent = convocationEmail({
    stagiaire: { prenom: contact.prenom, nom: contact.nom },
    formation: { titre: session.formation.titre },
    session: { dateDebut, dateFin, lieu: session.lieu || undefined },
  });

  const result = await sendEmail({
    to: contact.email,
    ...emailContent,
    attachments: [
      {
        filename: `convocation-${contact.prenom}-${contact.nom}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  return NextResponse.json({ success: true, skipped: (result as any)?.skipped || false });
}
