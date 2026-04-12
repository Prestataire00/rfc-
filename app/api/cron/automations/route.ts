export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, convocationEmail, evaluationEmail, ficheBesoinClientEmail, ficheBesoinStagiaireEmail } from "@/lib/email";
import { computeTriggerDate } from "@/lib/automations";

// GET /api/cron/automations
// Execute toutes les automatisations dont la date de declenchement est passee et qui n'ont pas encore ete executees.
// Protege par bearer si CRON_SECRET est defini.
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Charger regles globales
    const globals = await prisma.automationRule.findMany();
    const globalsByType = new Map(globals.map((g) => [g.type, g]));

    // Charger sessions "vivantes" (cree il y a moins de 60 jours, pas archivee)
    const d60ago = new Date(now);
    d60ago.setDate(d60ago.getDate() - 60);
    const sessions = await prisma.session.findMany({
      where: { dateFin: { gte: d60ago } },
      include: {
        formation: true,
        inscriptions: {
          where: { statut: { in: ["en_attente", "confirmee", "presente"] } },
          include: { contact: { include: { entreprise: true } } },
        },
        devis: { include: { entreprise: true, contact: true } },
        automations: true,
      },
    });

    const results: { sessionId: string; type: string; status: string; detail?: string }[] = [];

    for (const session of sessions) {
      const overrideMap = new Map(session.automations.map((o) => [o.type, o]));

      for (const global of globals) {
        const override = overrideMap.get(global.type);

        // Rule effective = override ou global
        const rule = {
          enabled: override?.enabled ?? global.enabled,
          relativeTo: override?.relativeTo ?? global.relativeTo,
          offsetDays: override?.offsetDays ?? global.offsetDays,
          offsetHours: override?.offsetHours ?? global.offsetHours,
          timeOfDay: override?.timeOfDay ?? global.timeOfDay,
          templateId: override?.templateId ?? global.templateId,
        };

        if (!rule.enabled) continue;
        if (override?.executedAt) continue; // deja execute pour cette session

        // Calcul date de trigger
        const trigger = computeTriggerDate(rule, {
          dateDebut: session.dateDebut,
          dateFin: session.dateFin,
          dateCreation: session.createdAt,
          dateInscription: session.createdAt, // fallback, par inscription c'est gere differemment (plus tard)
        });

        if (!trigger) continue;
        if (trigger > now) continue; // pas encore du

        // Execution selon le type
        let status: "ok" | "skipped" | "error" = "skipped";
        let detail = "";

        try {
          if (global.type === "convocation") {
            // Envoi de la convocation a tous les inscrits confirmes avec email
            let sent = 0;
            for (const ins of session.inscriptions) {
              if (!ins.contact.email) continue;
              const mail = convocationEmail({
                stagiaire: { prenom: ins.contact.prenom, nom: ins.contact.nom },
                formation: { titre: session.formation.titre },
                session: {
                  dateDebut: session.dateDebut.toISOString(),
                  dateFin: session.dateFin.toISOString(),
                  lieu: session.lieu || undefined,
                },
              });
              const res = await sendEmail({ to: ins.contact.email, ...mail });
              if (!res.skipped) sent++;
            }
            status = "ok";
            detail = `Convocation envoyee a ${sent} stagiaire(s)`;
          }

          else if (global.type === "satisfaction_chaud" || global.type === "satisfaction_froid") {
            const type = global.type;
            const presetId = type === "satisfaction_chaud" ? "preset_satisfaction_chaud" : "preset_satisfaction_froid";
            const preset = await prisma.evaluationTemplate.findUnique({ where: { id: rule.templateId || presetId } });
            const snapshot = preset?.questions || null;

            let created = 0;
            for (const ins of session.inscriptions) {
              if (!ins.contact.email) continue;
              const existing = await prisma.evaluation.findFirst({
                where: { sessionId: session.id, contactId: ins.contactId, type },
              });
              if (existing) continue;
              const token = randomBytes(32).toString("hex");
              await prisma.evaluation.create({
                data: {
                  type,
                  cible: "stagiaire",
                  sessionId: session.id,
                  contactId: ins.contactId,
                  tokenAcces: token,
                  questionsSnapshot: snapshot,
                },
              });
              const lien = `${baseUrl}/evaluation/${token}`;
              await sendEmail({
                to: ins.contact.email,
                ...evaluationEmail({
                  stagiaire: { prenom: ins.contact.prenom, nom: ins.contact.nom },
                  formation: { titre: session.formation.titre },
                  type,
                  lien,
                }),
              }).catch((e) => console.error("email evaluation:", e));
              created++;
            }
            status = "ok";
            detail = `${created} evaluation(s) ${type} creee(s) et envoyee(s)`;
          }

          else if (global.type === "positionnement") {
            const presetId = rule.templateId || "preset_positionnement";
            const preset = await prisma.evaluationTemplate.findUnique({ where: { id: presetId } });
            const snapshot = preset?.questions || null;
            let created = 0;
            for (const ins of session.inscriptions) {
              if (!ins.contact.email) continue;
              const existing = await prisma.evaluation.findFirst({
                where: { sessionId: session.id, contactId: ins.contactId, type: "acquis" },
              });
              if (existing) continue;
              const token = randomBytes(32).toString("hex");
              await prisma.evaluation.create({
                data: {
                  type: "acquis",
                  cible: "stagiaire",
                  sessionId: session.id,
                  contactId: ins.contactId,
                  tokenAcces: token,
                  questionsSnapshot: snapshot,
                },
              });
              const lien = `${baseUrl}/evaluation/${token}`;
              await sendEmail({
                to: ins.contact.email,
                ...evaluationEmail({
                  stagiaire: { prenom: ins.contact.prenom, nom: ins.contact.nom },
                  formation: { titre: session.formation.titre },
                  type: "acquis",
                  lien,
                }),
              }).catch(() => {});
              created++;
            }
            status = "ok";
            detail = `${created} test(s) de positionnement envoye(s)`;
          }

          else if (global.type === "fiche_besoin_client") {
            const entreprise = session.devis?.entreprise || session.inscriptions[0]?.contact?.entreprise || null;
            const destinataireContact = session.devis?.contact;
            const destinataireEmail = destinataireContact?.email || entreprise?.email || "";
            const destinataireNom = destinataireContact ? `${destinataireContact.prenom} ${destinataireContact.nom}` : entreprise?.nom || "";

            let fiche = await prisma.besoinClient.findFirst({ where: { sessionId: session.id } });
            if (!fiche) {
              fiche = await prisma.besoinClient.create({
                data: {
                  sessionId: session.id,
                  entrepriseId: entreprise?.id ?? null,
                  tokenAcces: randomBytes(24).toString("hex"),
                  statut: "en_attente",
                  optionnel: session.modeExpress,
                  destinataireNom,
                  destinataireEmail,
                },
              });
            }
            if (destinataireEmail && fiche.statut !== "repondu") {
              await sendEmail({
                to: destinataireEmail,
                ...ficheBesoinClientEmail({
                  destinataireNom: destinataireNom || entreprise?.nom || "",
                  entreprise: { nom: entreprise?.nom || "" },
                  formation: { titre: session.formation.titre },
                  session: { dateDebut: session.dateDebut.toISOString() },
                  link: `${baseUrl}/fiche-besoin-client/${fiche.tokenAcces}`,
                  optionnel: session.modeExpress,
                }),
              });
              await prisma.besoinClient.update({ where: { id: fiche.id }, data: { statut: "envoye", dateEnvoi: new Date() } });
            }
            status = "ok";
            detail = destinataireEmail ? "Fiche besoin client envoyee" : "Fiche creee (pas d'email destinataire)";
          }

          else if (global.type === "fiche_besoin_stagiaire") {
            let sent = 0;
            for (const ins of session.inscriptions) {
              if (!ins.contact.email) continue;
              let fiche = await prisma.besoinStagiaire.findUnique({
                where: { sessionId_contactId: { sessionId: session.id, contactId: ins.contactId } },
              });
              if (!fiche) {
                fiche = await prisma.besoinStagiaire.create({
                  data: {
                    sessionId: session.id,
                    contactId: ins.contactId,
                    tokenAcces: randomBytes(24).toString("hex"),
                    statut: "en_attente",
                    optionnel: session.modeExpress,
                  },
                });
              }
              if (fiche.statut !== "repondu") {
                await sendEmail({
                  to: ins.contact.email,
                  ...ficheBesoinStagiaireEmail({
                    stagiaire: { prenom: ins.contact.prenom, nom: ins.contact.nom },
                    formation: { titre: session.formation.titre },
                    session: { dateDebut: session.dateDebut.toISOString() },
                    link: `${baseUrl}/fiche-besoin-stagiaire/${fiche.tokenAcces}`,
                    optionnel: session.modeExpress,
                  }),
                });
                await prisma.besoinStagiaire.update({ where: { id: fiche.id }, data: { statut: "envoye", dateEnvoi: new Date() } });
                sent++;
              }
            }
            status = "ok";
            detail = `Fiche besoin envoyee a ${sent} stagiaire(s)`;
          }

          else {
            // rappel_presence, convention, attestation, facture : noter comme execute (extension future)
            status = "ok";
            detail = `Action ${global.type} marquee comme executee (hook futur)`;
          }
        } catch (err: unknown) {
          status = "error";
          detail = err instanceof Error ? err.message : "Erreur inconnue";
          console.error(`Automation ${global.type} session ${session.id} failed:`, err);
        }

        // Enregistrer l'execution (creer l'override s'il n'existe pas)
        await prisma.sessionAutomation.upsert({
          where: { sessionId_type: { sessionId: session.id, type: global.type } },
          create: {
            sessionId: session.id,
            type: global.type,
            enabled: rule.enabled,
            relativeTo: rule.relativeTo,
            offsetDays: rule.offsetDays,
            offsetHours: rule.offsetHours,
            timeOfDay: rule.timeOfDay,
            templateId: rule.templateId,
            executedAt: new Date(),
            executionLog: detail,
          },
          update: {
            executedAt: new Date(),
            executionLog: detail,
          },
        });

        results.push({ sessionId: session.id, type: global.type, status, detail });
      }
    }

    return NextResponse.json({
      total: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      errors: results.filter((r) => r.status === "error").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      timestamp: now.toISOString(),
      results,
    });
  } catch (err: unknown) {
    console.error("cron automations error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur cron" }, { status: 500 });
  }
}
