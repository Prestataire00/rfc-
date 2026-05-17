export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, devisEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withErrorHandler(async (req: NextRequest) => {
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

  // URL absolue vers le PDF du devis (pas la facture !).
  // Lien public sans auth — le devis est consultable par le destinataire via le lien.
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://projetrfc.netlify.app";
  const pdfUrl = `${baseUrl}/api/pdf/devis/${devisId}`;

  // Email expéditeur RFC pour le retour signé (depuis Parametres si défini).
  const parametres = await prisma.parametres.findUnique({
    where: { id: "default" },
    select: { email: true },
  });
  const retourEmail = parametres?.email ?? undefined;

  const dateValidite = devis.dateValidite
    ? devis.dateValidite.toLocaleDateString("fr-FR")
    : undefined;

  const emailContent = devisEmail({
    contact: { prenom: devis.contact.prenom, nom: devis.contact.nom },
    entreprise: { nom: devis.entreprise?.nom || "Client" },
    devis: {
      numero: devis.numero,
      objet: devis.objet,
      montantTTC: devis.montantTTC,
      dateValidite,
    },
    pdfUrl,
    retourEmail,
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
    logger.warn("historique.devis_envoye_failed", { error: String(logErr) });
  }

  return NextResponse.json({ success: true, skipped: result.skipped });
});
