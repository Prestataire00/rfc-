export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, factureEmail } from "@/lib/email";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function POST(req: NextRequest) {
  try {
    const { factureId } = await req.json();

    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: {
        entreprise: true,
        devis: { include: { contact: true } },
      },
    });

    if (!facture) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // Résolution de l'email : entreprise en priorité, sinon contact du devis
    const email = facture.entreprise?.email || facture.devis?.contact?.email;
    if (!email) {
      return NextResponse.json(
        { error: "Aucun email disponible pour cette facture (ni entreprise ni contact)" },
        { status: 400 }
      );
    }

    const destinataireNom = facture.devis?.contact
      ? `${facture.devis.contact.prenom} ${facture.devis.contact.nom}`
      : facture.entreprise?.nom || "Client";

    const dateEcheance = format(new Date(facture.dateEcheance), "dd/MM/yyyy", { locale: fr });

    const emailContent = factureEmail({
      destinataire: { nom: destinataireNom },
      entreprise: { nom: facture.entreprise?.nom || "Client" },
      facture: { numero: facture.numero, montantTTC: facture.montantTTC, dateEcheance },
    });

    const result = await sendEmail({ to: email, ...emailContent });

    // Passer le statut à "envoyee" si encore "en_attente"
    if (facture.statut === "en_attente") {
      await prisma.facture.update({
        where: { id: factureId },
        data: { statut: "envoyee" },
      });
    }

    return NextResponse.json({ success: true, skipped: (result as any)?.skipped || false });
  } catch (err: unknown) {
    console.error("Erreur lors de l'envoi de la facture:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi de la facture" }, { status: 500 });
  }
}
