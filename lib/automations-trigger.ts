// lib/automations-trigger.ts
// Entry point evenementiel du moteur d'automatisation.
// Appele depuis les routes POST pour declencher les regles en temps reel.
// Inspire de SO SAFE (server/automation-engine.ts).

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderMessageTemplate } from "@/lib/message-templates";
import { formatDateFR } from "@/lib/message-templates";
import { createHash } from "crypto";

export type AutomationEvent =
  | "prospect_created"
  | "prospect_converted"
  | "besoin_created"
  | "besoin_qualified"
  | "devis_created"
  | "devis_sent"
  | "devis_signed"
  | "facture_created"
  | "facture_paid"
  | "facture_overdue"
  | "session_created"
  | "session_confirmed"
  | "session_started"
  | "session_terminee"
  | "inscription_created"
  | "inscription_confirmed"
  | "inscription_completed"
  | "inscription_cancelled"
  | "attestation_generated"
  | "badge_awarded"
  | "recyclage_due";

export interface AutomationContext {
  prospectId?: string;
  besoinId?: string;
  devisId?: string;
  factureId?: string;
  sessionId?: string;
  inscriptionId?: string;
  contactId?: string;
  entrepriseId?: string;
  formationId?: string;
  formateurId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Point d'entree evenementiel. Fire-and-forget recommande.
 *
 * Usage :
 * ```ts
 * triggerAutomation("inscription_created", {
 *   inscriptionId: inscription.id,
 *   sessionId: session.id,
 *   contactId: contact.id,
 * }).catch(() => {});
 * ```
 */
export async function triggerAutomation(
  event: AutomationEvent,
  ctx: AutomationContext
): Promise<void> {
  try {
    // Charger les regles V2 actives ayant ce trigger
    const rules = await prisma.automationRuleV2.findMany({
      where: { trigger: event, enabled: true },
    });

    if (rules.length === 0) return;

    console.log(`[automation] Event "${event}" -> ${rules.length} regle(s) candidate(s)`);

    // Pre-charger les entites pour l'evaluation des conditions
    const [contact, formation, session] = await Promise.all([
      ctx.contactId ? prisma.contact.findUnique({ where: { id: ctx.contactId } }) : null,
      ctx.formationId ? prisma.formation.findUnique({ where: { id: ctx.formationId } }) : null,
      ctx.sessionId ? prisma.session.findUnique({ where: { id: ctx.sessionId }, include: { formation: true } }) : null,
    ]);

    // Si on a une session mais pas de formation dans le ctx, la deduire
    const effectiveFormation = formation || session?.formation || null;

    for (const rule of rules) {
      // Evaluer les conditions
      let conditions: { field: string; operator: string; value: string | string[] }[] = [];
      try { conditions = JSON.parse(rule.conditions); } catch { /* keep empty */ }

      if (conditions.length > 0) {
        const condCtx = {
          formation: effectiveFormation ? { id: effectiveFormation.id, categorie: effectiveFormation.categorie || "" } : undefined,
          contact: contact ? { type: contact.type } : undefined,
          inscription: undefined,
        };

        const allMatch = conditions.every((cond) => {
          const val = resolveField(cond.field, condCtx);
          if (val === undefined) return false;
          switch (cond.operator) {
            case "equals": return val === cond.value;
            case "not_equals": return val !== cond.value;
            case "in": return Array.isArray(cond.value) ? cond.value.includes(val) : cond.value.split(",").map(v => v.trim()).includes(val);
            default: return true;
          }
        });

        if (!allMatch) continue;
      }

      // Deduplication
      const dedupeHash = createHash("sha256")
        .update([rule.id, event, ctx.sessionId, ctx.contactId, ctx.inscriptionId, ctx.devisId].filter(Boolean).join(":"))
        .digest("hex").slice(0, 32);

      const existing = await prisma.automationExecutionV2.findFirst({
        where: { deduplicationHash: dedupeHash, status: "success" },
      });
      if (existing) continue;

      // Executer l'action
      let actionConfig: Record<string, string> = {};
      try { actionConfig = JSON.parse(rule.actionConfig); } catch { /* keep empty */ }

      let status: "success" | "error" = "success";
      let detail = "";

      try {
        switch (rule.actionType) {
          case "send_email": {
            if (!ctx.contactId) { detail = "Pas de contactId"; status = "error"; break; }
            const c = contact || await prisma.contact.findUnique({ where: { id: ctx.contactId } });
            if (!c?.email) { detail = "Pas d'email"; status = "error"; break; }
            const templateType = actionConfig.templateId;
            if (templateType) {
              const sess = session || (ctx.sessionId ? await prisma.session.findUnique({ where: { id: ctx.sessionId }, include: { formation: true } }) : null);
              const tpl = await renderMessageTemplate(templateType, {
                stagiaire: { prenom: c.prenom, nom: c.nom },
                formation: { titre: sess?.formation?.titre || effectiveFormation?.titre || "" },
                session: sess ? { dateDebut: formatDateFR(sess.dateDebut), dateFin: formatDateFR(sess.dateFin), lieu: sess.lieu || "" } : {},
              });
              if (tpl) {
                await sendEmail({ to: c.email, subject: tpl.subject, html: tpl.html });
                detail = `Email envoye a ${c.email}`;
              } else {
                detail = `Template ${templateType} introuvable`;
                status = "error";
              }
            } else {
              detail = "Pas de templateId configure";
              status = "error";
            }
            break;
          }
          case "change_status": {
            if (ctx.sessionId && actionConfig.targetStatus) {
              await prisma.session.update({ where: { id: ctx.sessionId }, data: { statut: actionConfig.targetStatus } });
              detail = `Statut session -> ${actionConfig.targetStatus}`;
            } else {
              detail = "sessionId ou targetStatus manquant";
              status = "error";
            }
            break;
          }
          default:
            detail = `Action ${rule.actionType} executee (hook)`;
        }
      } catch (err) {
        status = "error";
        detail = err instanceof Error ? err.message : String(err);
      }

      // Logger
      await prisma.automationExecutionV2.create({
        data: {
          ruleId: rule.id,
          sessionId: ctx.sessionId || "",
          contactId: ctx.contactId,
          status,
          payload: JSON.stringify({ event, ...ctx }),
          errorMessage: status === "error" ? detail : null,
          deduplicationHash: dedupeHash,
        },
      });

      console.log(`[automation] Regle "${rule.nom}" -> ${status}: ${detail}`);
    }
  } catch (err) {
    console.error(`[automation] triggerAutomation("${event}") echec:`, err);
  }
}

function resolveField(field: string, ctx: Record<string, unknown>): string | undefined {
  const parts = field.split(".");
  let val: unknown = ctx;
  for (const p of parts) {
    if (val && typeof val === "object" && p in (val as Record<string, unknown>)) {
      val = (val as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof val === "string" ? val : undefined;
}
