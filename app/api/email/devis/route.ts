export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, devisEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";

export async function POST(req: NextRequest) {
  try {
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

    try {
      await logAction({
        action: "devis_envoye",
        label: "Devis " + devis.numero + " envoyé par email",
        detail: "Envoyé à " + devis.contact!.email,
        lien: "/commercial/devis/" + devisId,
        entrepriseId: devis.entrepriseId ?? undefined,
        contactId: devis.contactId ?? undefined,
        devisId: devisId,
      });
    } catch (logErr) {
      console.warn("logAction devis_envoye échoué:", logErr);
    }

    return NextResponse.json({ success: true, skipped: result.skipped });
  } catch (err: unknown) {
    console.error("Erreur lors de l'envoi du devis:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi du devis" }, { status: 500 });
  }
}
