export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fichePreFormationStagiaireReponseSchema } from "@/lib/validations/fiche-pre-formation-stagiaire";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";
import { encryptNSS, decryptNSS } from "@/lib/encryption";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { notifyAdmins } from "@/lib/notifications";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const GET = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:fiche-stagiaire:get");
  if (limited) return limited;

  const fiche = await prisma.fichePreFormationStagiaire.findUnique({
    where: { tokenAcces: params.token },
    include: {
      session: {
        select: {
          id: true,
          dateDebut: true,
          dateFin: true,
          formation: { select: { titre: true, categorie: true } },
        },
      },
      // Fiche créée pré-session (depuis prospect stagiaire individuel) :
      // la formation est rattachée directement à la fiche.
      formation: { select: { titre: true, categorie: true } },
      contact: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          dateNaissance: true,
          numeroSecuriteSociale: true,
          numeroPasseportPrevention: true,
          niveauFormation: true,
        },
      },
    },
  });
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });

  // Masquer partiellement le numero de secu (ne revelons pas ce qui est en base pour un non-authentifie).
  // Décrypter d'abord pour masquer le clair, pas le ciphertext.
  if (fiche.contact?.numeroSecuriteSociale) {
    const plain = decryptNSS(fiche.contact.numeroSecuriteSociale);
    fiche.contact.numeroSecuriteSociale = plain ? "••••••••••••" + plain.slice(-3) : null;
  }
  return NextResponse.json(fiche);
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:fiche-stagiaire:post");
  if (limited) return limited;

  const fiche = await prisma.fichePreFormationStagiaire.findUnique({
    where: { tokenAcces: params.token },
    include: {
      formation: true,
      session: { include: { formation: true } },
      contact: true,
      demande: { select: { id: true, devisId: true } },
    },
  });
  // Early returns explicites preserves : codes 4xx publics.
  if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (fiche.statut === "repondu") {
    return NextResponse.json({ error: "Fiche deja soumise" }, { status: 409 });
  }

  const d = await parseBody(req, fichePreFormationStagiaireReponseSchema);

  // MAJ contact si donnees legales fournies (date naissance, n° secu, passeport prevention)
  const contactUpdate: Record<string, unknown> = {};
  if (d.dateNaissance) {
    const date = new Date(d.dateNaissance);
    if (!isNaN(date.getTime())) contactUpdate.dateNaissance = date;
  }
  if (d.numeroSecuriteSociale && !d.numeroSecuriteSociale.startsWith("•")) {
    contactUpdate.numeroSecuriteSociale = encryptNSS(d.numeroSecuriteSociale.replace(/\s/g, ""));
  }
  if (d.numeroPasseportPrevention) contactUpdate.numeroPasseportPrevention = d.numeroPasseportPrevention;
  if (d.niveauFormation) contactUpdate.niveauFormation = d.niveauFormation;
  if (d.estRQTH || d.detailsRQTH) {
    const details = [d.estRQTH ? "RQTH: oui" : null, d.detailsRQTH, d.contraintesPhysiques, d.contraintesLangue]
      .filter(Boolean).join(" | ");
    if (details) contactUpdate.besoinsAdaptation = details;
  }

  // Atomique : MAJ contact + MAJ fichePreFormationStagiaire dans la meme transaction.
  // Eviter qu'un crash entre les deux laisse un contact partiellement mis a jour.
  await prisma.$transaction(async (tx) => {
    if (Object.keys(contactUpdate).length > 0) {
      await tx.contact.update({ where: { id: fiche.contactId! }, data: contactUpdate });
    }
    await tx.fichePreFormationStagiaire.update({
      where: { id: fiche.id },
      data: {
        numeroPasseportPrevention: d.numeroPasseportPrevention ?? null,
        dejaSuivi: d.dejaSuivi,
        dateDerniereFormation: d.dateDerniereFormation ? new Date(d.dateDerniereFormation) : null,
        niveauFormation: d.niveauFormation ?? null,
        niveauPrerequis: d.niveauPrerequis ?? null,
        estRQTH: d.estRQTH,
        detailsRQTH: d.detailsRQTH ?? null,
        contraintesPhysiques: d.contraintesPhysiques ?? null,
        contraintesLangue: d.contraintesLangue ?? null,
        contraintesAlimentaires: d.contraintesAlimentaires ?? null,
        consentementRGPD: d.consentementRGPD,
        consentementBPF: d.consentementBPF,
        statut: "repondu",
        dateReponse: new Date(),
      },
    });
  });

  // ── Auto-génération du devis brouillon (hors transaction) ─────────────
  // Cas stagiaire individuel : devis lié au contact uniquement (entrepriseId null),
  // formation × 1 stagiaire. Idempotent : skip si la demande a déjà un devis.
  const formation = fiche.session?.formation ?? fiche.formation;
  let autoDevisId: string | null = null;
  if (fiche.demandeId && !fiche.demande?.devisId && formation && fiche.contactId) {
    try {
      const quantite = 1;
      const tarifUnit = formation.tarif ?? 0;
      const montantHT = tarifUnit * quantite;
      const tauxTVA = 20;
      const montantTTC = montantHT * (1 + tauxTVA / 100);

      const allDevis = await prisma.devis.findMany({ select: { numero: true } });
      const maxNum = allDevis.reduce((m, dv) => {
        const n = parseInt(dv.numero.split("-").pop() || "0");
        return n > m ? n : m;
      }, 0);
      const numero = generateNumero("DEV", maxNum);

      const dateValidite = new Date();
      dateValidite.setDate(dateValidite.getDate() + 30);

      const devis = await prisma.$transaction(async (tx) => {
        const dv = await tx.devis.create({
          data: {
            numero,
            objet: `Formation ${formation.titre} - stagiaire individuel`,
            montantHT,
            tauxTVA,
            montantTTC,
            dateEmission: new Date(),
            dateValidite,
            statut: "brouillon",
            entrepriseId: null,
            contactId: fiche.contactId,
            notes: `Devis brouillon généré automatiquement à la réception de la fiche pré-formation stagiaire (${new Date().toLocaleDateString("fr-FR")}). Stagiaire individuel — ajustez si besoin avant envoi pour signature.`,
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
        await tx.demande.update({
          where: { id: fiche.demandeId! },
          data: { devisId: dv.id, statut: "qualifie" },
        });
        return dv;
      });
      autoDevisId = devis.id;

      const clientLabel = fiche.contact
        ? `${fiche.contact.prenom} ${fiche.contact.nom}`
        : "Stagiaire";
      await notifyAdmins({
        titre: "Fiche stagiaire reçue + devis brouillon généré",
        message: `${clientLabel} — ${numero} (${formatCurrency(montantTTC)}) à réviser avant envoi signature`,
        type: "info",
        lien: `/commercial/devis/${devis.id}`,
      }).catch((err) => logger.warn("public.fiche_stagiaire.notify_failed", { error: String(err) }));

      await logAction({
        action: "devis_genere_auto",
        label: `Devis ${numero} généré auto à la soumission de la fiche pré-formation stagiaire`,
        lien: `/commercial/devis/${devis.id}`,
        contactId: fiche.contactId,
        devisId: devis.id,
      }).catch((err) => logger.warn("public.fiche_stagiaire.log_failed", { error: String(err) }));
    } catch (devisErr) {
      logger.warn("public.fiche_stagiaire.auto_devis_failed", {
        ficheId: fiche.id,
        error: String(devisErr),
      });
    }
  } else if (fiche.demandeId && !fiche.demande?.devisId) {
    await prisma.demande.update({
      where: { id: fiche.demandeId },
      data: { statut: "qualifie" },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, autoDevisId });
});
