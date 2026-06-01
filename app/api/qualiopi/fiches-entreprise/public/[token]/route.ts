export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fichePreFormationEntrepriseReponseSchema } from "@/lib/validations/fiche-pre-formation-entreprise";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { notifyAdmins } from "@/lib/notifications";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const GET = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:fiche-entreprise:get");
  if (limited) return limited;

  const fiche = await prisma.fichePreFormationEntreprise.findUnique({
    where: { tokenAcces: params.token },
    include: {
      session: {
        select: {
          id: true,
          dateDebut: true,
          dateFin: true,
          formation: { select: { titre: true, categorie: true, duree: true } },
        },
      },
      // Fiche créée pré-session (depuis prospect) : formation rattachée directement.
      formation: { select: { titre: true, categorie: true, duree: true } },
      entreprise: { select: { id: true, nom: true, secteur: true, effectif: true } },
    },
  });
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  return NextResponse.json(fiche);
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:fiche-entreprise:post");
  if (limited) return limited;

  const fiche = await prisma.fichePreFormationEntreprise.findUnique({
    where: { tokenAcces: params.token },
    include: {
      entreprise: true,
      formation: true,
      session: { include: { formation: true } },
      demande: true,
    },
  });
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (fiche.statut === "repondu") {
    return NextResponse.json({ error: "Fiche deja soumise" }, { status: 409 });
  }

  const data = await parseBody(req, fichePreFormationEntrepriseReponseSchema);

  // Atomique : fiche → repondu + maj entreprise.
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.fichePreFormationEntreprise.update({
      where: { id: fiche.id },
      data: {
        ...data,
        statut: "repondu",
        dateReponse: new Date(),
      },
    });

    if (fiche.entrepriseId && data.effectifTotal) {
      await tx.entreprise.update({
        where: { id: fiche.entrepriseId },
        data: {
          effectif: data.effectifTotal,
          secteur: data.secteurActivite || fiche.entreprise?.secteur || null,
        },
      });
    }

    return u;
  });

  // ── Auto-génération du devis brouillon (hors transaction) ─────────────
  // Décision (2026-06-01, v2 flow) : à la soumission de la fiche, on génère
  // immédiatement un devis brouillon pré-rempli (formation × effectif), prêt
  // pour révision admin. Le but : l'admin ouvre la page prospect et trouve
  // déjà un devis à ajuster, pas une fiche à transformer.
  //
  // Skip si :
  //   - pas d'entreprise rattachée (devis exige entrepriseId)
  //   - pas de formation (ni via session, ni directe)
  //   - la demande a déjà un devis (idempotence)
  const formation = fiche.session?.formation ?? fiche.formation;
  const demandeId = fiche.demandeId;
  const dejaUnDevis = demandeId
    ? !!(await prisma.demande.findUnique({
        where: { id: demandeId },
        select: { devisId: true },
      }))?.devisId
    : false;

  let autoDevisId: string | null = null;
  if (fiche.entrepriseId && formation && !dejaUnDevis) {
    try {
      const quantite = Math.max(1, updated.effectifConcerne ?? data.effectifConcerne ?? 1);
      const tarifUnit = formation.tarif ?? 0;
      const montantHT = tarifUnit * quantite;
      const tauxTVA = 20;
      const montantTTC = montantHT * (1 + tauxTVA / 100);

      const allDevis = await prisma.devis.findMany({ select: { numero: true } });
      const maxNum = allDevis.reduce((m, d) => {
        const n = parseInt(d.numero.split("-").pop() || "0");
        return n > m ? n : m;
      }, 0);
      const numero = generateNumero("DEV", maxNum);

      const dateValidite = new Date();
      dateValidite.setDate(dateValidite.getDate() + 30);

      const devis = await prisma.$transaction(async (tx) => {
        const d = await tx.devis.create({
          data: {
            numero,
            objet: `Formation ${formation.titre} - ${quantite} stagiaire${quantite > 1 ? "s" : ""}`,
            montantHT,
            tauxTVA,
            montantTTC,
            dateEmission: new Date(),
            dateValidite,
            statut: "brouillon",
            entrepriseId: fiche.entrepriseId,
            notes: `Devis brouillon généré automatiquement à la réception de la fiche pré-formation (${new Date().toLocaleDateString("fr-FR")}). Ajustez le prix si besoin avant envoi pour signature.`,
            lignes: {
              create: [{
                designation: `${formation.titre}${formation.duree ? ` (${formation.duree} h)` : ""}`,
                quantite,
                prixUnitaire: tarifUnit,
                montant: montantHT,
              }],
            },
          },
          select: { id: true },
        });
        if (demandeId) {
          await tx.demande.update({
            where: { id: demandeId },
            data: { devisId: d.id, statut: "qualifie" },
          });
        }
        return d;
      });
      autoDevisId = devis.id;

      // Notif admin + log
      const clientLabel = fiche.entreprise?.nom || "Client";
      await notifyAdmins({
        titre: "Fiche reçue + devis brouillon généré",
        message: `${clientLabel} — ${numero} (${formatCurrency(montantTTC)}) à réviser avant envoi signature`,
        type: "info",
        lien: `/commercial/devis/${devis.id}`,
      }).catch((err) => logger.warn("public.fiche.notify_failed", { error: String(err) }));

      await logAction({
        action: "devis_genere_auto",
        label: `Devis ${numero} généré auto à la soumission de la fiche pré-formation`,
        lien: `/commercial/devis/${devis.id}`,
        entrepriseId: fiche.entrepriseId,
        devisId: devis.id,
      }).catch((err) => logger.warn("public.fiche.log_failed", { error: String(err) }));
    } catch (devisErr) {
      logger.warn("public.fiche.auto_devis_failed", {
        ficheId: fiche.id,
        error: String(devisErr),
      });
    }
  } else if (demandeId && !dejaUnDevis) {
    // Demande sans devis mais sans formation/entreprise rattachée :
    // on marque quand même qualifié pour signaler à l'admin qu'elle est mûre.
    await prisma.demande.update({
      where: { id: demandeId },
      data: { statut: "qualifie" },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, id: updated.id, autoDevisId });
});
