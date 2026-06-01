// Génération automatique d'un devis brouillon à partir d'une FichePreFormationEntreprise
// "repondu" — adresse l'exigence du cahier des charges §2.2 :
// "Un formulaire de recueil de besoin générera automatiquement un devis."
//
// Le devis est créé en statut "brouillon" → l'admin le revoit, l'ajuste et
// l'envoie au client pour signature électronique. Pré-rempli avec :
//   - entreprise = entreprise de la fiche pré-formation
//   - 1 ligne de devis : formation × effectifConcerne (ou 1 si non renseigné),
//     prix unitaire = formation.tarif
//   - objet = "Formation <titre> - <N> stagiaire(s)"
//   - validité 30 jours par défaut

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

// Audit + UX 2026-05-21 : body optionnel pour permettre à l'admin de fixer
// son prix (et tout le reste) depuis la page d'édition guidée
// /qualiopi/fiches-pre-formation/[id]/generer-devis.
// Sans body, le calcul auto-pré-rempli (tarif catalogue × effectif) s'applique
// comme avant — compat ascendante avec les callers historiques.
const ligneOverrideSchema = z.object({
  designation: z.string().min(1),
  quantite: z.coerce.number().int().positive(),
  prixUnitaire: z.coerce.number().nonnegative(),
});
const overridesSchema = z
  .object({
    objet: z.string().min(1).optional(),
    notes: z.string().optional(),
    dateValidite: z.string().optional(), // ISO date string
    tauxTVA: z.coerce.number().nonnegative().optional(),
    lignes: z.array(ligneOverrideSchema).min(1).optional(),
  })
  .optional();

export const POST = withErrorHandlerParams(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    // body optionnel — pas d'erreur si pas de body (compat)
    let overrides: z.infer<typeof overridesSchema> = undefined;
    try {
      const raw = await req.json();
      const parsed = overridesSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Overrides invalides", issues: parsed.error.flatten().fieldErrors },
          { status: 422 },
        );
      }
      overrides = parsed.data;
    } catch {
      overrides = undefined;
    }

    const fiche = await prisma.fichePreFormationEntreprise.findUnique({
      where: { id: params.id },
      include: {
        session: {
          include: { formation: true },
        },
        entreprise: true,
      },
    });

    if (!fiche) {
      return NextResponse.json({ error: "Fiche pré-formation entreprise introuvable" }, { status: 404 });
    }
    if (fiche.statut !== "repondu") {
      return NextResponse.json(
        { error: "La fiche doit être à l'état 'repondu' pour générer un devis (statut actuel : " + fiche.statut + ")" },
        { status: 422 },
      );
    }
    if (!fiche.entrepriseId) {
      return NextResponse.json({ error: "Pas d'entreprise rattachée à la fiche" }, { status: 422 });
    }
    if (!fiche.session?.formation) {
      return NextResponse.json({ error: "Session ou formation introuvable" }, { status: 422 });
    }

    const formation = fiche.session.formation;
    const defaultQuantite = Math.max(1, fiche.effectifConcerne ?? 1);
    const defaultTarif = formation.tarif ?? 0;
    const defaultDesignation = `${formation.titre}${formation.duree ? ` (${formation.duree} h)` : ""}`;

    // Lignes : si overrides.lignes fourni, on utilise ; sinon pré-rempli tarif catalogue
    const lignesFinales = overrides?.lignes && overrides.lignes.length > 0
      ? overrides.lignes.map((l) => ({
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          montant: l.quantite * l.prixUnitaire,
        }))
      : [{
          designation: defaultDesignation,
          quantite: defaultQuantite,
          prixUnitaire: defaultTarif,
          montant: defaultTarif * defaultQuantite,
        }];

    const montantHT = lignesFinales.reduce((sum, l) => sum + l.montant, 0);
    const tauxTVA = overrides?.tauxTVA ?? 20;
    const montantTTC = montantHT * (1 + tauxTVA / 100);

    // Numérotation séquentielle (même règle que POST /api/devis)
    const allDevis = await prisma.devis.findMany({ select: { numero: true } });
    const maxNum = allDevis.reduce((max, d) => {
      const n = parseInt(d.numero.split("-").pop() || "0");
      return n > max ? n : max;
    }, 0);
    const numero = generateNumero("DEV", maxNum);

    const validite = overrides?.dateValidite
      ? new Date(overrides.dateValidite)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d;
        })();

    const objet = overrides?.objet
      ?? `Formation ${formation.titre} - ${defaultQuantite} stagiaire${defaultQuantite > 1 ? "s" : ""}`;
    const notes = overrides?.notes
      ?? `Devis généré automatiquement depuis la fiche pré-formation entreprise #${fiche.id} (réponse du ${fiche.dateReponse?.toLocaleDateString("fr-FR") ?? "—"}).`;

    const devis = await prisma.devis.create({
      data: {
        numero,
        objet,
        montantHT,
        montantTTC,
        tauxTVA,
        dateEmission: new Date(),
        dateValidite: validite,
        statut: "brouillon",
        entrepriseId: fiche.entrepriseId,
        notes,
        lignes: { create: lignesFinales },
      },
      include: { lignes: true },
    });

    try {
      await logAction({
        action: "devis_cree",
        label: `Devis ${numero} généré depuis fiche pré-formation entreprise (${formatCurrency(montantTTC)})`,
        lien: `/commercial/devis/${devis.id}`,
        entrepriseId: devis.entrepriseId ?? undefined,
        devisId: devis.id,
      });
    } catch (logErr) {
      logger.warn("historique.devis_genere_besoin_failed", { error: String(logErr) });
    }

    return NextResponse.json({
      devisId: devis.id,
      numero: devis.numero,
      redirectUrl: `/commercial/devis/${devis.id}`,
    }, { status: 201 });
  }
);
