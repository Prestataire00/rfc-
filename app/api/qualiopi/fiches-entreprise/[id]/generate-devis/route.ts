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
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
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
    const quantite = Math.max(1, fiche.effectifConcerne ?? 1);
    const tarifUnitaire = formation.tarif ?? 0;
    const ligneMontant = tarifUnitaire * quantite;

    // Numérotation séquentielle (même règle que POST /api/devis)
    const allDevis = await prisma.devis.findMany({ select: { numero: true } });
    const maxNum = allDevis.reduce((max, d) => {
      const n = parseInt(d.numero.split("-").pop() || "0");
      return n > max ? n : max;
    }, 0);
    const numero = generateNumero("DEV", maxNum);

    const tauxTVA = 20;
    const montantHT = ligneMontant;
    const montantTTC = montantHT * (1 + tauxTVA / 100);

    const validite = new Date();
    validite.setDate(validite.getDate() + 30);

    const objet = `Formation ${formation.titre} - ${quantite} stagiaire${quantite > 1 ? "s" : ""}`;
    const designation = `${formation.titre}${formation.duree ? ` (${formation.duree} h)` : ""}`;

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
        notes: `Devis généré automatiquement depuis la fiche pré-formation entreprise #${fiche.id} (réponse du ${fiche.dateReponse?.toLocaleDateString("fr-FR") ?? "—"}).`,
        lignes: {
          create: [
            {
              designation,
              quantite,
              prixUnitaire: tarifUnitaire,
              montant: ligneMontant,
            },
          ],
        },
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
