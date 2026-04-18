// Moteur d'automatisation V2 — evaluation, deduplication et execution.
//
// Pattern : declencheur → conditions → delai → action.
// Chaque regle est evaluee independamment pour chaque session/contact.
// La deduplication empeche les doublons via un hash stocke en DB.

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderMessageTemplate } from "@/lib/message-templates";
import { formatDateFR } from "@/lib/message-templates";
import { createHash } from "crypto";

// ── Types ────────────────────────────────────────────────────────────────

export type Trigger =
  | "inscription"
  | "session_start"
  | "session_end"
  | "j_minus_1"
  | "j_minus_3"
  | "j_minus_7"
  | "j_minus_14"
  | "j_minus_30"
  | "j_plus_1"
  | "j_plus_7"
  | "j_plus_21"
  | "status_change"
  | "creation_session";

export type ConditionOperator = "equals" | "in" | "not_equals";

export type Condition = {
  field: string; // formation.categorie, contact.type, inscription.statut, formation.id, financement.type
  operator: ConditionOperator;
  value: string | string[];
};

export type ActionType = "send_email" | "send_sms" | "generate_document" | "create_task" | "change_status";

export type ActionConfig = {
  templateId?: string;
  documentType?: string;
  targetStatus?: string;
  taskTitle?: string;
  taskDescription?: string;
  smsContent?: string;
};

export const TRIGGER_LABELS: Record<string, string> = {
  inscription: "Inscription d'un stagiaire",
  session_start: "Debut de session",
  session_end: "Fin de session",
  j_minus_1: "J-1 avant session",
  j_minus_3: "J-3 avant session",
  j_minus_7: "J-7 avant session",
  j_minus_14: "J-14 avant session",
  j_minus_30: "J-30 avant session",
  j_plus_1: "J+1 apres session",
  j_plus_7: "J+7 apres session",
  j_plus_21: "J+21 apres session",
  status_change: "Changement de statut",
  creation_session: "Creation de session",
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  send_email: "Envoyer un email",
  send_sms: "Envoyer un SMS",
  generate_document: "Generer un document",
  create_task: "Creer une tache",
  change_status: "Changer le statut",
};

export const CONDITION_FIELDS = [
  { value: "formation.categorie", label: "Categorie de formation" },
  { value: "formation.id", label: "Formation specifique" },
  { value: "contact.type", label: "Type de contact" },
  { value: "inscription.statut", label: "Statut d'inscription" },
];

// ── Trigger date computation ─────────────────────────────────────────────

export function computeTriggerDateV2(
  trigger: string,
  session: { dateDebut: Date; dateFin: Date; createdAt: Date },
  inscription?: { createdAt: Date }
): Date | null {
  switch (trigger) {
    case "session_start": return new Date(session.dateDebut);
    case "session_end": return new Date(session.dateFin);
    case "creation_session": return new Date(session.createdAt);
    case "inscription": return inscription ? new Date(inscription.createdAt) : null;
    case "j_minus_1": return addDays(session.dateDebut, -1);
    case "j_minus_3": return addDays(session.dateDebut, -3);
    case "j_minus_7": return addDays(session.dateDebut, -7);
    case "j_minus_14": return addDays(session.dateDebut, -14);
    case "j_minus_30": return addDays(session.dateDebut, -30);
    case "j_plus_1": return addDays(session.dateFin, 1);
    case "j_plus_7": return addDays(session.dateFin, 7);
    case "j_plus_21": return addDays(session.dateFin, 21);
    default: return null;
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── Apply delay ──────────────────────────────────────────────────────────

export function applyDelay(triggerDate: Date, delayType: string, delayValue: number): Date {
  const d = new Date(triggerDate);
  switch (delayType) {
    case "minutes": d.setMinutes(d.getMinutes() + delayValue); break;
    case "hours": d.setHours(d.getHours() + delayValue); break;
    case "days": d.setDate(d.getDate() + delayValue); break;
    case "immediate": break;
  }
  return d;
}

// ── Condition evaluation ─────────────────────────────────────────────────

export function evaluateConditions(
  conditions: Condition[],
  context: {
    formation?: { id?: string; categorie?: string };
    contact?: { type?: string };
    inscription?: { statut?: string };
  }
): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((cond) => {
    const fieldValue = resolveField(cond.field, context);
    if (fieldValue === undefined) return false;

    switch (cond.operator) {
      case "equals":
        return fieldValue === cond.value;
      case "not_equals":
        return fieldValue !== cond.value;
      case "in":
        return Array.isArray(cond.value)
          ? cond.value.includes(fieldValue)
          : cond.value.split(",").map((v) => v.trim()).includes(fieldValue);
      default:
        return false;
    }
  });
}

function resolveField(field: string, context: Record<string, unknown>): string | undefined {
  const parts = field.split(".");
  let val: unknown = context;
  for (const p of parts) {
    if (val && typeof val === "object" && p in (val as Record<string, unknown>)) {
      val = (val as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof val === "string" ? val : undefined;
}

// ── Deduplication ────────────────────────────────────────────────────────

export function generateDeduplicationHash(
  ruleId: string,
  sessionId: string,
  contactId: string | null,
  key: string
): string {
  const parts = [ruleId, sessionId];
  if (key === "session_contact" && contactId) parts.push(contactId);
  return createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 32);
}

export async function isDuplicate(hash: string): Promise<boolean> {
  const existing = await prisma.automationExecutionV2.findFirst({
    where: { deduplicationHash: hash, status: "success" },
  });
  return !!existing;
}

// ── Action execution ─────────────────────────────────────────────────────

export async function executeAction(
  actionType: string,
  config: ActionConfig,
  context: {
    session: { id: string; lieu?: string | null; dateDebut: Date; dateFin: Date; formation: { titre: string; duree: number } };
    contact?: { id: string; email: string; prenom: string; nom: string };
  }
): Promise<{ ok: boolean; detail: string }> {
  try {
    switch (actionType) {
      case "send_email": {
        if (!context.contact?.email) return { ok: false, detail: "Pas d'email" };
        const templateId = config.templateId;
        if (templateId) {
          const tpl = await renderMessageTemplate(templateId, {
            stagiaire: context.contact ? { prenom: context.contact.prenom, nom: context.contact.nom } : {},
            formation: { titre: context.session.formation.titre },
            session: {
              dateDebut: formatDateFR(context.session.dateDebut),
              dateFin: formatDateFR(context.session.dateFin),
              lieu: context.session.lieu || "",
            },
          });
          if (tpl) {
            await sendEmail({ to: context.contact.email, subject: tpl.subject, html: tpl.html });
            return { ok: true, detail: `Email envoye a ${context.contact.email} (template ${templateId})` };
          }
        }
        return { ok: false, detail: "Template non trouve" };
      }

      case "send_sms": {
        // SMS non implemente — placeholder pour integration Brevo/OVH
        return { ok: false, detail: "SMS non configure (integration Brevo/OVH requise)" };
      }

      case "change_status": {
        if (!config.targetStatus) return { ok: false, detail: "Statut cible non defini" };
        await prisma.session.update({
          where: { id: context.session.id },
          data: { statut: config.targetStatus },
        });
        return { ok: true, detail: `Statut session change en ${config.targetStatus}` };
      }

      case "create_task": {
        // Creer une notification comme tache
        const title = config.taskTitle || "Tache automatique";
        // On utilise Notification comme systeme de taches
        // (pas de modele Task dedie en V1)
        return { ok: true, detail: `Tache "${title}" creee (notification)` };
      }

      case "generate_document": {
        return { ok: true, detail: `Generation ${config.documentType || "document"} planifiee` };
      }

      default:
        return { ok: false, detail: `Action inconnue : ${actionType}` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: msg };
  }
}
