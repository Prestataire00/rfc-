// POST /api/prospects/backfill-fiches
// Rattrape tous les prospects (Demande) qui n'ont AUCUNE fiche pré-formation
// rattachée et leur envoie la bonne fiche selon le type de contact :
//   - Contact.type "stagiaire" + pas d'entreprise → FichePreFormationStagiaire
//   - autre cas (entreprise, organisme) → FichePreFormationEntreprise
//
// Idempotent : un second appel ne réenvoie rien car les prospects ont
// désormais leur fiche en base. Pour FORCER un renvoi sur un prospect
// particulier, utiliser POST /api/prospects/[id]/envoyer-fiche (qui
// renvoie sur la fiche existante).
//
// Skip silencieux :
//   - Contact sans email (impossible d'envoyer)
//   - Demande déjà liée à un devis (statut downstream du tunnel, prospect
//     déjà traité)
//
// Body optionnel : { dryRun: true } pour avoir le compte sans envoyer.
// Réponse : { total, eligible, sent, failed, skipped_no_email, skipped_has_devis, dryRun }
//
// AUTH : endpoint admin uniquement (à protéger via NextAuth quand le wrapper
// d'auth admin sera disponible — pour l'instant accessible côté serveur).

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { sendEmail, fichePreFormationEntrepriseEmail, fichePreFormationStagiaireEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Liste les demandes éligibles : pas de devis ET pas de fiche existante
  // (ni entreprise ni stagiaire). On filtre côté Node après le fetch car
  // Prisma n'a pas de jointure "pas d'enregistrement lié" directe.
  const demandesBrutes = await prisma.demande.findMany({
    where: {
      devisId: null, // pas encore de devis = encore dans le funnel d'entrée
    },
    include: {
      contact: { select: { id: true, prenom: true, nom: true, email: true, type: true } },
      entreprise: { select: { id: true, nom: true, secteur: true, effectif: true } },
      formation: { select: { id: true, titre: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Récupère les demandeId déjà couverts par une fiche en parallèle
  const [ficheEntrepriseDemandeIds, ficheStagiaireDemandeIds] = await Promise.all([
    prisma.fichePreFormationEntreprise.findMany({
      where: { demandeId: { in: demandesBrutes.map((d) => d.id) } },
      select: { demandeId: true },
    }).then((rows) => new Set(rows.map((r) => r.demandeId).filter((id): id is string => !!id))),
    prisma.fichePreFormationStagiaire.findMany({
      where: { demandeId: { in: demandesBrutes.map((d) => d.id) } },
      select: { demandeId: true },
    }).then((rows) => new Set(rows.map((r) => r.demandeId).filter((id): id is string => !!id))),
  ]);

  const eligibles = demandesBrutes.filter(
    (d) => !ficheEntrepriseDemandeIds.has(d.id) && !ficheStagiaireDemandeIds.has(d.id),
  );

  const stats = {
    total: demandesBrutes.length,
    eligible: eligibles.length,
    sent: 0,
    failed: 0,
    skipped_no_email: 0,
    skipped_has_devis: 0, // toujours 0 puisque filtré au début, gardé pour clarté
    dryRun,
    details: [] as Array<{ demandeId: string; status: string; reason?: string }>,
  };

  if (dryRun) {
    stats.details = eligibles.map((d) => ({
      demandeId: d.id,
      status: d.contact?.email ? "would_send" : "would_skip_no_email",
    }));
    return NextResponse.json(stats);
  }

  for (const demande of eligibles) {
    const contact = demande.contact;
    if (!contact?.email) {
      stats.skipped_no_email++;
      stats.details.push({ demandeId: demande.id, status: "skipped_no_email" });
      continue;
    }

    const titre = demande.formation?.titre || demande.titre || "votre formation";
    const destinataireNom = `${contact.prenom} ${contact.nom}`;
    const estStagiaireIndividuel = contact.type === "stagiaire" && !demande.entrepriseId;

    try {
      if (estStagiaireIndividuel) {
        const fiche = await prisma.fichePreFormationStagiaire.create({
          data: {
            demandeId: demande.id,
            formationId: demande.formationId,
            contactId: contact.id,
            tokenAcces: randomBytes(24).toString("hex"),
            statut: "en_attente",
          },
        });
        const mail = fichePreFormationStagiaireEmail({
          stagiaire: { prenom: contact.prenom, nom: contact.nom },
          formation: { titre },
          session: null,
          link: `${baseUrl}/qualiopi/fiche-stagiaire/${fiche.tokenAcces}`,
        });
        const envoi = await sendEmail({
          to: contact.email,
          subject: mail.subject,
          html: mail.html,
        });
        if (envoi.skipped) {
          stats.failed++;
          stats.details.push({
            demandeId: demande.id,
            status: "failed",
            reason: "email_skipped (Resend non configuré ou destinataire refusé)",
          });
          continue;
        }
        await prisma.fichePreFormationStagiaire.update({
          where: { id: fiche.id },
          data: { statut: "envoye", dateEnvoi: new Date() },
        });
      } else {
        const fiche = await prisma.fichePreFormationEntreprise.create({
          data: {
            demandeId: demande.id,
            entrepriseId: demande.entrepriseId,
            formationId: demande.formationId,
            tokenAcces: randomBytes(24).toString("hex"),
            statut: "en_attente",
            destinataireNom,
            destinataireEmail: contact.email,
            secteurActivite: demande.entreprise?.secteur ?? null,
            effectifTotal: demande.entreprise?.effectif ?? null,
          },
        });
        const mail = fichePreFormationEntrepriseEmail({
          destinataireNom,
          entreprise: { nom: demande.entreprise?.nom || "" },
          formation: { titre },
          session: null,
          link: `${baseUrl}/qualiopi/fiche-entreprise/${fiche.tokenAcces}`,
        });
        const envoi = await sendEmail({
          to: contact.email,
          subject: mail.subject,
          html: mail.html,
        });
        if (envoi.skipped) {
          stats.failed++;
          stats.details.push({
            demandeId: demande.id,
            status: "failed",
            reason: "email_skipped (Resend non configuré ou destinataire refusé)",
          });
          continue;
        }
        await prisma.fichePreFormationEntreprise.update({
          where: { id: fiche.id },
          data: { statut: "envoye", dateEnvoi: new Date() },
        });
      }

      stats.sent++;
      stats.details.push({ demandeId: demande.id, status: "sent" });

      await logAction({
        action: "fiche_pre_formation_envoyee",
        label: `Fiche pré-formation envoyée à ${contact.email} (backfill)`,
        lien: `/prospects/${demande.id}`,
        contactId: contact.id,
        entrepriseId: demande.entrepriseId ?? undefined,
      }).catch(() => {});
    } catch (err) {
      logger.warn("backfill.fiche_failed", { demandeId: demande.id, error: String(err) });
      stats.failed++;
      stats.details.push({ demandeId: demande.id, status: "failed", reason: String(err) });
    }
  }

  return NextResponse.json(stats);
});
