// GET /api/funnel/resolve-prospect?devisId=... | ?factureId=... | ?ficheId=...
// Remonte la Demande source à partir d'un artifact downstream du tunnel.
// Utilisé par <ProspectBackLink /> pour afficher un badge "Prospect: X" en
// haut des pages détail devis/facture/fiche, donnant à l'admin un accès
// 1-clic au dossier prospect d'origine.
//
// Renvoie 200 + { demandeId: null } si pas de prospect rattaché (devis créé
// hors pipeline). Le composant gère le null gracieusement.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { BESOIN_STATUTS } from "@/lib/constants";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const devisId = searchParams.get("devisId");
  const factureId = searchParams.get("factureId");
  const ficheId = searchParams.get("ficheId");

  if (!devisId && !factureId && !ficheId) {
    return NextResponse.json({ error: "Spécifier devisId, factureId ou ficheId" }, { status: 400 });
  }

  let demandeId: string | null = null;

  if (devisId) {
    // Demande.devisId pointe sur le devis (relation 1-N côté Demande)
    const demande = await prisma.demande.findFirst({
      where: { devisId },
      select: { id: true },
    });
    demandeId = demande?.id ?? null;
  } else if (factureId) {
    // Facture → Devis → Demande
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      select: { devisId: true },
    });
    if (facture?.devisId) {
      const demande = await prisma.demande.findFirst({
        where: { devisId: facture.devisId },
        select: { id: true },
      });
      demandeId = demande?.id ?? null;
    }
  } else if (ficheId) {
    // Fiche entreprise OU stagiaire — chercher en parallèle
    const [ficheEnt, ficheStag] = await Promise.all([
      prisma.fichePreFormationEntreprise.findUnique({
        where: { id: ficheId },
        select: { demandeId: true },
      }),
      prisma.fichePreFormationStagiaire.findUnique({
        where: { id: ficheId },
        select: { demandeId: true },
      }),
    ]);
    demandeId = ficheEnt?.demandeId ?? ficheStag?.demandeId ?? null;
  }

  if (!demandeId) {
    return NextResponse.json({ demandeId: null });
  }

  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    select: {
      id: true,
      titre: true,
      statut: true,
      contact: { select: { prenom: true, nom: true } },
      entreprise: { select: { nom: true } },
    },
  });
  if (!demande) {
    return NextResponse.json({ demandeId: null });
  }

  const statutCfg = BESOIN_STATUTS[demande.statut as keyof typeof BESOIN_STATUTS];

  return NextResponse.json({
    demandeId: demande.id,
    titre: demande.titre,
    contactNom: demande.contact ? `${demande.contact.prenom} ${demande.contact.nom}` : null,
    entrepriseNom: demande.entreprise?.nom ?? null,
    statutLabel: statutCfg?.label ?? demande.statut,
  });
});
