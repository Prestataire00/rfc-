export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeTriggerDateV2,
  applyDelay,
  evaluateConditions,
  generateDeduplicationHash,
  isDuplicate,
  executeAction,
  type Condition,
  type ActionConfig,
} from "@/lib/automations-v2";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/cron/automations-v2
// Execute par le cron Netlify toutes les 15 minutes.
// Evalue chaque regle V2 active contre les sessions recentes.
export const GET = withErrorHandler(async (req: NextRequest) => {
  // Verification du bearer token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const now = new Date();
  const results: { ruleId: string; ruleName: string; sessionId: string; contactId?: string; status: string; detail: string }[] = [];

  // Charger les regles actives
  const rules = await prisma.automationRuleV2.findMany({
    where: { enabled: true },
  });

  if (rules.length === 0) {
    return NextResponse.json({ total: 0, results: [], timestamp: now.toISOString() });
  }

  // Charger les sessions des 60 derniers jours (meme fenetre que V1)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.session.findMany({
    where: {
      createdAt: { gte: sixtyDaysAgo },
      statut: { not: "annulee" },
    },
    include: {
      formation: { select: { id: true, titre: true, duree: true, categorie: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "en_attente", "presente"] } },
        include: { contact: { select: { id: true, email: true, prenom: true, nom: true, type: true } } },
      },
    },
  });

  for (const rule of rules) {
    let conditions: Condition[] = [];
    let actionConfig: ActionConfig = {};
    try { conditions = JSON.parse(rule.conditions); } catch { /* keep empty */ }
    try { actionConfig = JSON.parse(rule.actionConfig); } catch { /* keep empty */ }

    for (const session of sessions) {
      // Calculer la date de declenchement
      const triggerDate = computeTriggerDateV2(rule.trigger, session);
      if (!triggerDate) continue;

      // Appliquer le delai
      const execDate = applyDelay(triggerDate, rule.delayType, rule.delayValue);

      // Pas encore le moment ?
      if (execDate > now) continue;

      // Trop ancien (> 7 jours dans le passe) ? Skip pour eviter les rattrapages massifs.
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (execDate < sevenDaysAgo) continue;

      // Si l'action cible un contact (email, sms), boucler sur les inscrits
      const perContact = ["send_email", "send_sms"].includes(rule.actionType);

      if (perContact) {
        for (const insc of session.inscriptions) {
          const contact = insc.contact;

          // Evaluer les conditions
          const condCtx = {
            formation: { id: session.formation.id, categorie: session.formation.categorie || "" },
            contact: { type: contact.type },
            inscription: { statut: insc.statut },
          };
          if (!evaluateConditions(conditions, condCtx)) continue;

          // Deduplication
          const hash = generateDeduplicationHash(rule.id, session.id, contact.id, rule.deduplicationKey);
          if (await isDuplicate(hash)) continue;

          // Executer
          const result = await executeAction(rule.actionType, actionConfig, {
            session: { id: session.id, lieu: session.lieu, dateDebut: session.dateDebut, dateFin: session.dateFin, formation: session.formation },
            contact: { id: contact.id, email: contact.email, prenom: contact.prenom, nom: contact.nom },
          });

          // Logger
          await prisma.automationExecutionV2.create({
            data: {
              ruleId: rule.id,
              sessionId: session.id,
              contactId: contact.id,
              status: result.ok ? "success" : "error",
              payload: JSON.stringify({ trigger: rule.trigger, delay: `${rule.delayType}:${rule.delayValue}` }),
              errorMessage: result.ok ? null : result.detail,
              deduplicationHash: hash,
            },
          });

          results.push({
            ruleId: rule.id,
            ruleName: rule.nom,
            sessionId: session.id,
            contactId: contact.id,
            status: result.ok ? "ok" : "error",
            detail: result.detail,
          });
        }
      } else {
        // Action au niveau session (change_status, generate_document, create_task)
        const condCtx = {
          formation: { id: session.formation.id, categorie: session.formation.categorie || "" },
        };
        if (!evaluateConditions(conditions, condCtx)) continue;

        const hash = generateDeduplicationHash(rule.id, session.id, null, "session");
        if (await isDuplicate(hash)) continue;

        const result = await executeAction(rule.actionType, actionConfig, {
          session: { id: session.id, lieu: session.lieu, dateDebut: session.dateDebut, dateFin: session.dateFin, formation: session.formation },
        });

        await prisma.automationExecutionV2.create({
          data: {
            ruleId: rule.id,
            sessionId: session.id,
            status: result.ok ? "success" : "error",
            payload: JSON.stringify({ trigger: rule.trigger }),
            errorMessage: result.ok ? null : result.detail,
            deduplicationHash: hash,
          },
        });

        results.push({
          ruleId: rule.id,
          ruleName: rule.nom,
          sessionId: session.id,
          status: result.ok ? "ok" : "error",
          detail: result.detail,
        });
      }
    }
  }

  return NextResponse.json({
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    errors: results.filter((r) => r.status === "error").length,
    timestamp: now.toISOString(),
    results,
  });
});
