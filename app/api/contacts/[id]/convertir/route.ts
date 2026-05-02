export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

// POST /api/contacts/[id]/convertir
// Convertit un prospect en client : cree/lie entreprise, passe type -> "client".
// La transaction interne est preservee (creation entreprise + update contact atomiques).
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const contact = await prisma.contact.findUnique({ where: { id: params.id } });
  if (!contact) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  if (contact.type !== "prospect") {
    return NextResponse.json({ error: "Seuls les prospects peuvent etre convertis" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let entrepriseId = body.entrepriseExistanteId || contact.entrepriseId;

    // Creer une nouvelle entreprise si demande
    if (!entrepriseId && body.nouvelleEntreprise) {
      const ent = await tx.entreprise.create({
        data: {
          nom: body.nouvelleEntreprise.nom,
          siret: body.nouvelleEntreprise.siret || undefined,
          adresse: body.nouvelleEntreprise.adresse || undefined,
          ville: body.nouvelleEntreprise.ville || undefined,
          codePostal: body.nouvelleEntreprise.codePostal || undefined,
          email: body.nouvelleEntreprise.email || undefined,
          telephone: body.nouvelleEntreprise.telephone || undefined,
        },
      });
      entrepriseId = ent.id;
    }

    if (!entrepriseId) {
      throw new Error("entrepriseExistanteId ou nouvelleEntreprise requis");
    }

    const updated = await tx.contact.update({
      where: { id: params.id },
      data: { type: "client", entrepriseId },
      include: { entreprise: true },
    });

    return { contact: updated, entrepriseId };
  });

  // Historique (best-effort, hors tx)
  prisma.historiqueAction.create({
    data: {
      action: "prospect_converti",
      label: `${contact.prenom} ${contact.nom} converti en client`,
      lien: `/contacts/${contact.id}`,
      entrepriseId: result.entrepriseId,
      contactId: contact.id,
    },
  }).catch((err) => logger.warn("historique.prospect_converti_failed", { error: String(err) }));

  // Automations + notifications (fire-and-forget)
  triggerAutomation("prospect_converted", {
    contactId: contact.id,
    entrepriseId: result.entrepriseId,
  }).catch((err) => logger.warn("automation.prospect_converted_failed", { error: String(err) }));

  notifyAdmins({
    titre: "Prospect converti",
    message: `${contact.prenom} ${contact.nom} est maintenant un client`,
    type: "success",
    lien: `/contacts/${contact.id}`,
  }).catch((err) => logger.warn("notify.prospect_converti_failed", { error: String(err) }));

  return NextResponse.json(result.contact);
});
