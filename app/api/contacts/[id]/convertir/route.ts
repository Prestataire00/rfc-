export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";

// POST /api/contacts/[id]/convertir
// Convertit un prospect en client : cree/lie entreprise, passe type -> "client".
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    // Historique
    await prisma.historiqueAction.create({
      data: {
        action: "prospect_converti",
        label: `${contact.prenom} ${contact.nom} converti en client`,
        lien: `/contacts/${contact.id}`,
        entrepriseId: result.entrepriseId,
        contactId: contact.id,
      },
    }).catch(() => {});

    // Automations + notifications (fire-and-forget)
    triggerAutomation("prospect_converted", {
      contactId: contact.id,
      entrepriseId: result.entrepriseId,
    }).catch(() => {});

    notifyAdmins({
      titre: "Prospect converti",
      message: `${contact.prenom} ${contact.nom} est maintenant un client`,
      type: "success",
      lien: `/contacts/${contact.id}`,
    }).catch(() => {});

    return NextResponse.json(result.contact);
  } catch (err) {
    console.error("POST contacts/[id]/convertir:", err);
    const msg = err instanceof Error ? err.message : "Erreur conversion";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
