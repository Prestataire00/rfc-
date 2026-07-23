export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fichePreFormationEntreprisePublicReponseSchema } from "@/lib/validations/fiche-pre-formation-entreprise";
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

  const data = await parseBody(req, fichePreFormationEntreprisePublicReponseSchema);
  // `stagiaires` n'est pas une colonne de la fiche : on le sort du spread et on
  // le matérialise en Contact + JSON `stagiairesData`.
  const { stagiaires, ...ficheData } = data;

  const parseNaissance = (s?: string | null): Date | null => {
    if (!s || !s.trim()) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  // Atomique : fiche → repondu + maj entreprise + création/déduplication des
  // contacts stagiaires (par email) rattachés à l'entreprise.
  const updated = await prisma.$transaction(async (tx) => {
    // Crée ou met à jour un Contact par email pour chaque stagiaire saisi.
    const stagiairesData: Array<{
      contactId: string;
      prenom: string;
      nom: string;
      email: string;
      dateNaissance: string | null;
      sexe: string | null;
      lieuNaissance: string | null;
    }> = [];
    for (const s of stagiaires) {
      const email = s.email.toLowerCase();
      const identite = {
        prenom: s.prenom,
        nom: s.nom,
        dateNaissance: parseNaissance(s.dateNaissance),
        sexe: s.sexe ?? undefined,
        lieuNaissance: s.lieuNaissance ?? undefined,
      };
      const contact = await tx.contact.upsert({
        where: { email },
        create: {
          email,
          type: "stagiaire",
          entrepriseId: fiche.entrepriseId ?? undefined,
          ...identite,
        },
        // Ne rétrograde jamais un client existant ; complète juste l'identité.
        update: {
          entrepriseId: fiche.entrepriseId ?? undefined,
          ...identite,
        },
        select: { id: true },
      });
      stagiairesData.push({
        contactId: contact.id,
        prenom: s.prenom,
        nom: s.nom,
        email,
        dateNaissance: s.dateNaissance ?? null,
        sexe: s.sexe ?? null,
        lieuNaissance: s.lieuNaissance ?? null,
      });
    }

    const u = await tx.fichePreFormationEntreprise.update({
      where: { id: fiche.id },
      data: {
        ...ficheData,
        stagiairesData: JSON.stringify(stagiairesData),
        statut: "repondu",
        dateReponse: new Date(),
      },
    });

    if (fiche.entrepriseId && ficheData.effectifTotal) {
      await tx.entreprise.update({
        where: { id: fiche.entrepriseId },
        data: {
          effectif: ficheData.effectifTotal,
          secteur: ficheData.secteurActivite || fiche.entreprise?.secteur || null,
        },
      });
    }

    // Propage les infos "analyse des besoins" vers la Demande (vue commerciale).
    if (fiche.demandeId) {
      // Dates souhaitées : JSON ["YYYY-MM-DD", …] → chaîne lisible pour la Demande.
      let datesLisibles: string | undefined;
      try {
        const arr = JSON.parse(ficheData.datesSouhaitees || "[]");
        if (Array.isArray(arr) && arr.length > 0) {
          datesLisibles = arr
            .filter((d): d is string => typeof d === "string" && !!d)
            .map((d) => new Date(d).toLocaleDateString("fr-FR"))
            .join(", ");
        }
      } catch { /* ignore */ }

      await tx.demande.update({
        where: { id: fiche.demandeId },
        data: {
          ...(stagiairesData.length > 0 ? { nbStagiaires: stagiairesData.length } : {}),
          ...(ficheData.sourceContact ? { sourceContact: ficheData.sourceContact } : {}),
          ...(datesLisibles ? { datesSouhaitees: datesLisibles } : {}),
          ...(ficheData.materielSurPlace ? { materielSurPlace: ficheData.materielSurPlace } : {}),
          ...(ficheData.observation ? { observation: ficheData.observation } : {}),
        },
      });
    }

    return u;
  });

  const nbStagiairesSaisis = stagiaires.length;

  // ── Auto-génération du devis brouillon (hors transaction) ─────────────
  // Décision (2026-06-01, v2 flow) : à la soumission de la fiche, on génère
  // immédiatement un devis brouillon pré-rempli (formation × effectif), prêt
  // pour révision admin.
  //
  // Skip auto-devis si :
  //   - pas d'entreprise rattachée (peut arriver pour stagiaire individuel
  //     mais on n'a pas le contactId ici sans demande)
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
  const clientLabel = fiche.entreprise?.nom || fiche.destinataireNom || "Client";

  let autoDevisId: string | null = null;
  let autoDevisNumero: string | null = null;
  let autoDevisMontantTTC: number | null = null;
  if (fiche.entrepriseId && formation && !dejaUnDevis) {
    try {
      // Priorité au nombre de stagiaires nominatifs saisis ; sinon l'effectif déclaré.
      const quantite = Math.max(
        1,
        nbStagiairesSaisis > 0 ? nbStagiairesSaisis : (updated.effectifConcerne ?? data.effectifConcerne ?? 1),
      );
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
      autoDevisNumero = numero;
      autoDevisMontantTTC = montantTTC;

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
    // Demande sans devis mais sans entreprise/formation : on marque qualifié
    // quand même pour signaler à l'admin que la demande est mûre.
    await prisma.demande.update({
      where: { id: demandeId },
      data: { statut: "qualifie" },
    }).catch(() => {});
  }

  // ── Notification admin (toujours émise, indépendamment du devis auto) ──
  // Décision : la notif "fiche reçue" est le déclencheur principal pour
  // l'admin. Le devis auto est un bonus mentionné quand il a réussi.
  // Lien :
  //   - vers le devis si auto-généré (action immédiate possible)
  //   - sinon vers le prospect (vue d'ensemble pour décider la suite)
  //   - sinon vers la liste des fiches (cas legacy sans demande rattachée)
  const notifLien = autoDevisId
    ? `/commercial/devis/${autoDevisId}`
    : demandeId
      ? `/prospects/${demandeId}`
      : `/qualiopi/fiches-pre-formation`;
  const notifTitre = autoDevisId
    ? "Fiche reçue + devis brouillon généré"
    : "Fiche pré-formation reçue";
  const stagiairesSuffix = nbStagiairesSaisis > 0
    ? ` — ${nbStagiairesSaisis} stagiaire${nbStagiairesSaisis > 1 ? "s" : ""} renseigné${nbStagiairesSaisis > 1 ? "s" : ""}`
    : "";
  const notifMessage = autoDevisId && autoDevisNumero && autoDevisMontantTTC !== null
    ? `${clientLabel} — ${autoDevisNumero} (${formatCurrency(autoDevisMontantTTC)}) à réviser avant envoi signature${stagiairesSuffix}`
    : `${clientLabel} a répondu à la fiche pré-formation${stagiairesSuffix}. À traiter pour générer le devis.`;
  await notifyAdmins({
    titre: notifTitre,
    message: notifMessage,
    type: autoDevisId ? "info" : "success",
    lien: notifLien,
  }).catch((err) => logger.warn("public.fiche.notify_failed", { error: String(err) }));

  // Log historique systématique pour la fiche reçue (indépendant du devis)
  await logAction({
    action: "fiche_pre_formation_repondue",
    label: `Fiche pré-formation reçue de ${clientLabel}`,
    lien: notifLien,
    entrepriseId: fiche.entrepriseId ?? undefined,
  }).catch((err) => logger.warn("public.fiche.log_recu_failed", { error: String(err) }));

  return NextResponse.json({ success: true, id: updated.id, autoDevisId });
});
