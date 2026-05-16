// Sync Devis ↔ SignatureRequest : quand un signataire complète la signature
// d'un devis via /sign/[token], on doit mettre à jour le devis côté CRM
// (statut → "signe", dateSigne, signatureUrl) ET déclencher les actions
// métier (notification admin + automations).
//
// Cahier des charges §2.2 :
// "Ce devis sera envoyé au client via un espace dédié pour signature
//  électronique. Une alerte sera envoyée à l'administrateur dès la signature."

import { prisma } from "@/lib/prisma";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";
import { logAction } from "@/lib/historique";
import { formatCurrency } from "@/lib/utils";
import { logger } from "@/lib/logger";

/**
 * Met à jour le Devis lié à une SignatureRequest qui vient d'être signée.
 * Idempotent : si le devis est déjà "signe", on ne déclenche pas à nouveau.
 */
export async function syncDevisOnSignature(
  devisId: string,
  signatureRequestId: string,
): Promise<void> {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { entreprise: true, contact: true },
  });
  if (!devis) {
    logger.warn("devis-sync.devis-not-found", { devisId, signatureRequestId });
    return;
  }

  // Idempotence : si déjà signé, ne rien refaire (cas du cron retry ou re-submit)
  if (devis.statut === "signe") return;

  await prisma.devis.update({
    where: { id: devisId },
    data: {
      statut: "signe",
      dateSigne: new Date(),
      // signatureUrl sera renseigné par finalize.ts une fois le PDF signé uploadé
    },
  });

  const label = devis.entreprise?.nom
    || (devis.contact ? `${devis.contact.prenom} ${devis.contact.nom}` : "Client");

  // Notification admin in-app
  await notifyAdmins({
    titre: "Devis signé électroniquement",
    message: `${label} a signé ${devis.numero} (${formatCurrency(devis.montantTTC)})`,
    type: "success",
    lien: `/commercial/devis/${devis.id}`,
  }).catch((err) => logger.warn("devis-sync.notify-failed", { error: String(err) }));

  // Historique
  await logAction({
    action: "devis_signe_electroniquement",
    label: `Devis ${devis.numero} signé électroniquement par ${label}`,
    lien: `/commercial/devis/${devis.id}`,
    entrepriseId: devis.entrepriseId ?? undefined,
    contactId: devis.contactId ?? undefined,
    devisId: devis.id,
  }).catch((err) => logger.warn("devis-sync.log-failed", { error: String(err) }));

  // Déclenche les règles d'automatisation V2 sur l'événement devis_signed.
  // Les admins peuvent configurer (UI /admin/automations) des règles type :
  //   - "envoyer email fiche renseignement stagiaire" (cf. cahier des charges §2.2)
  //   - "créer une facture brouillon"
  //   - etc.
  await triggerAutomation("devis_signed", {
    devisId: devis.id,
    entrepriseId: devis.entrepriseId ?? undefined,
    contactId: devis.contactId ?? undefined,
    meta: { signatureRequestId, source: "electronic_signature" },
  }).catch((err) => logger.warn("devis-sync.automation-failed", { error: String(err) }));
}
