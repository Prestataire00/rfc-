// GET /api/devis/[id]/fiche
// Remonte la fiche pré-formation (entreprise OU stagiaire) liée au devis
// via la chaîne Devis → Demande → Fiche. Utilisé par le panneau "Besoin
// client" sur la page détail du devis (/commercial/devis/[id]) pour que
// l'admin voie immédiatement ce que le client a répondu sans devoir
// naviguer vers le prospect.
//
// Réponse :
//   - { type: "entreprise", fiche: {...} } pour FichePreFormationEntreprise
//   - { type: "stagiaire", fiche: {...} } pour FichePreFormationStagiaire
//   - { type: null } si aucune fiche rattachée (devis créé hors pipeline)
//
// On ne renvoie que les champs de réponse utiles à la décision/affichage,
// pas les tokens d'accès ni les champs systèmes (sécurité de la surface).

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const devisId = params.id;

    // 1. Demande rattachée au devis
    const demande = await prisma.demande.findFirst({
      where: { devisId },
      select: { id: true },
    });
    if (!demande) {
      return NextResponse.json({ type: null });
    }

    // 2. Cherche en parallèle fiche entreprise et fiche stagiaire pour cette demande
    const [ficheEntreprise, ficheStagiaire] = await Promise.all([
      prisma.fichePreFormationEntreprise.findFirst({
        where: { demandeId: demande.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          statut: true,
          dateReponse: true,
          secteurActivite: true,
          effectifTotal: true,
          effectifConcerne: true,
          metiersStagiaires: true,
          contexteTravail: true,
          contraintesSpecifiques: true,
          objectifPrincipal: true,
          objectifsClient: true,
          casAccidentsRecents: true,
          detailsCasAccidents: true,
          contraintesHoraires: true,
          aStagiairesHandicap: true,
          detailsHandicap: true,
          entreprise: { select: { nom: true } },
          formation: { select: { titre: true } },
        },
      }),
      prisma.fichePreFormationStagiaire.findFirst({
        where: { demandeId: demande.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          statut: true,
          dateReponse: true,
          dejaSuivi: true,
          dateDerniereFormation: true,
          niveauFormation: true,
          niveauPrerequis: true,
          estRQTH: true,
          detailsRQTH: true,
          contraintesPhysiques: true,
          contraintesLangue: true,
          contraintesAlimentaires: true,
          consentementRGPD: true,
          consentementBPF: true,
          contact: { select: { prenom: true, nom: true } },
          formation: { select: { titre: true } },
        },
      }),
    ]);

    // Priorité fiche entreprise si les 2 existent (cas rare : prospect
    // entreprise + stagiaires nominaux qui ont aussi répondu).
    if (ficheEntreprise) {
      return NextResponse.json({ type: "entreprise" as const, fiche: ficheEntreprise });
    }
    if (ficheStagiaire) {
      return NextResponse.json({ type: "stagiaire" as const, fiche: ficheStagiaire });
    }
    return NextResponse.json({ type: null });
  },
);
