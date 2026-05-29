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
  // SignatureRequest <-> Devis = FK soft (cf. prisma/schema.prisma) → 2 requêtes
  // au lieu d'un include. Coût marginal (idx sur devisId), gain : pas de
  // couplage Prisma agressif et fiche devis enrichie du suivi signature.
  const [devis, signatureRequests] = await Promise.all([
    prisma.devis.findUnique({
      where: { id: params.id },
      include: {
        lignes: true,
        entreprise: true,
        contact: true,
        factures: true,
        sessions: { select: { id: true, dateDebut: true, dateFin: true, statut: true } },
      },
    }),
    prisma.signatureRequest.findMany({
      where: { devisId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        statut: true,
        createdAt: true,
        sentAt: true,
        viewedAt: true,
        signedAt: true,
        completedAt: true,
        expiresAt: true,
        signedFileUrl: true,
        certificateUrl: true,
        signataire: { select: { email: true, nom: true, statut: true } },
      },
    }),
  ]);
  if (!devis) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json({ ...devis, signatureRequests });
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

      // Mapping Devis.statut → Demande.statut (auto-sync, idempotent).
      // Une demande peut référencer ce devis via Demande.devisId.
      const demandeStatutMap: Record<string, string | undefined> = {
        envoye: "devis_envoye",
        signe: "accepte",
        refuse: "refuse",
      };
      const newDemandeStatut = demandeStatutMap[body.statut as string];
      if (newDemandeStatut) {
        try {
          const demandesAff = await prisma.demande.findMany({
            where: { devisId: params.id, statut: { not: newDemandeStatut } },
            select: { id: true, contactId: true, contact: { select: { type: true } } },
          });
          for (const d of demandesAff) {
            await prisma.demande.update({ where: { id: d.id }, data: { statut: newDemandeStatut } });
            // Auto-conversion prospect → client si passage à Gagné
            if (
              newDemandeStatut === "accepte" &&
              d.contactId &&
              d.contact?.type === "prospect"
            ) {
              await prisma.contact.update({ where: { id: d.contactId }, data: { type: "client" } });
            }
          }
        } catch (err) {
          logger.warn("devis-route.demande-sync-failed", { error: String(err), devisId: params.id });
        }
      }

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

  // Atomique : on remplace les lignes seulement si l'update du devis réussit.
  const devis = await prisma.$transaction(async (tx) => {
    await tx.ligneDevis.deleteMany({ where: { devisId: params.id } });
    return tx.devis.update({
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
  });
  return NextResponse.json(devis);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.devis.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
