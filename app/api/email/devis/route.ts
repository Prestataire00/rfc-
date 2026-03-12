import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, devisEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { devisId } = await req.json();

  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: {
      contact: true,
      entreprise: true,
    },
  });

  if (!devis) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  if (!devis.contact?.email) {
    return NextResponse.json({ error: "Le contact du devis n'a pas d'email" }, { status: 400 });
  }

  const emailContent = devisEmail({
    contact: { prenom: devis.contact.prenom, nom: devis.contact.nom },
    entreprise: { nom: devis.entreprise?.nom || "Client" },
    devis: { numero: devis.numero, objet: devis.objet, montantTTC: devis.montantTTC },
  });

  const result = await sendEmail({
    to: devis.contact.email,
    ...emailContent,
  });

  // Update devis status to "envoye" if still brouillon
  if (devis.statut === "brouillon") {
    await prisma.devis.update({
      where: { id: devisId },
      data: { statut: "envoye" },
    });
  }

  return NextResponse.json({ success: true, skipped: (result as any)?.skipped || false });
}
