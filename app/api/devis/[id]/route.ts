export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisSchema } from "@/lib/validations/devis";
import { logAction } from "@/lib/historique";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const devis = await prisma.devis.findUnique({
    where: { id: params.id },
    include: {
      lignes: true,
      entreprise: true,
      contact: true,
      factures: true,
      sessions: { select: { id: true, dateDebut: true, dateFin: true, statut: true } },
    },
  });
  if (!devis) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(devis);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();

  // Handle simple statut update
  if (body.statut && Object.keys(body).length === 1) {
    const oldDevis = await prisma.devis.findUnique({
      where: { id: params.id },
      select: { statut: true, numero: true, entrepriseId: true, contactId: true },
    });
    const devis = await prisma.devis.update({
      where: { id: params.id },
      data: { statut: body.statut },
      include: { entreprise: { select: { nom: true } }, contact: { select: { prenom: true, nom: true } } },
    });

    try {
      await logAction({
        action: "devis_statut",
        label: "Devis " + devis.numero + " -> " + body.statut,
        lien: "/commercial/devis/" + params.id,
        entrepriseId: devis.entrepriseId ?? undefined,
        devisId: params.id,
      });
    } catch (logErr) {
      logger.warn("historique.devis_statut_failed", { error: String(logErr) });
    }

    if (oldDevis && oldDevis.statut !== body.statut) {
      const label = devis.entreprise?.nom || (devis.contact ? `${devis.contact.prenom} ${devis.contact.nom}` : "Client");

      if (body.statut === "envoye") {
        triggerAutomation("devis_sent", { devisId: devis.id, entrepriseId: devis.entrepriseId ?? undefined, contactId: devis.contactId ?? undefined }).catch(() => {});
        notifyAdmins({ titre: "Devis envoye", message: `${label} — ${devis.numero}`, type: "info", lien: `/commercial/devis/${devis.id}` }).catch(() => {});
      }
      if (body.statut === "signe") {
        triggerAutomation("devis_signed", { devisId: devis.id, entrepriseId: devis.entrepriseId ?? undefined, contactId: devis.contactId ?? undefined }).catch(() => {});
        notifyAdmins({ titre: "Devis signe", message: `${label} a signe ${devis.numero}`, type: "success", lien: `/commercial/devis/${devis.id}` }).catch(() => {});
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (body.statut === "refuse") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        triggerAutomation("devis_refuse" as any, { devisId: devis.id, entrepriseId: devis.entrepriseId ?? undefined }).catch(() => {});
      }
    }

    return NextResponse.json(devis);
  }

  const parsed = devisSchema.parse(body);

  const { lignes, dateValidite, entrepriseId, contactId, tauxTVA, ...rest } = parsed;
  const montantHT = lignes.reduce((sum, l) => sum + l.montant, 0);
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  await prisma.ligneDevis.deleteMany({ where: { devisId: params.id } });

  const devis = await prisma.devis.update({
    where: { id: params.id },
    data: {
      ...rest,
      tauxTVA,
      montantHT,
      montantTTC,
      dateValidite: new Date(dateValidite),
      entrepriseId: entrepriseId || null,
      contactId: contactId || null,
      lignes: { create: lignes },
    },
    include: { lignes: true },
  });
  return NextResponse.json(devis);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.devis.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
