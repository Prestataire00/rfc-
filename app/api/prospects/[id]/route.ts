// GET /api/prospects/[id] — endpoint JOIN unifié pour la page prospect.
// Le `id` est l'ID de la Demande (entité agrégat : Contact + Entreprise + Devis + Formation).
// Retourne tout ce qui concerne le prospect en une seule requête.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const { id } = params;

    // 1. Charger la demande avec ses relations directes
    const demande = await prisma.demande.findUnique({
      where: { id },
      include: {
        contact: true,
        entreprise: true,
        formation: true,
        devis: {
          include: {
            lignes: true,
          },
        },
      },
    });

    if (!demande) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }

    // 2. Session liée au devis (marqueur Phase 3)
    let session = null;
    if (demande.devisId) {
      session = await prisma.session.findFirst({
        where: {
          notes: { contains: `[phase3:devis:${demande.devisId}]` },
        },
        include: {
          formateur: true,
          lieuFormation: true,
          formation: true,
        },
      });
    }

    // 3. Fiches : d'abord celles liées directement à la demande (créées auto à la
    // naissance du prospect), sinon fallback sur celles de la session si elle existe.
    let ficheEntreprise = await prisma.fichePreFormationEntreprise.findFirst({
      where: { demandeId: demande.id },
      orderBy: { createdAt: "desc" },
    });
    let fichesStagiaire = await prisma.fichePreFormationStagiaire.findMany({
      where: { demandeId: demande.id },
      include: { contact: true },
    });
    let inscriptions: Awaited<ReturnType<typeof prisma.inscription.findMany>> = [];

    if (session) {
      if (!ficheEntreprise) {
        ficheEntreprise = await prisma.fichePreFormationEntreprise.findFirst({
          where: { sessionId: session.id },
        });
      }
      if (fichesStagiaire.length === 0) {
        fichesStagiaire = await prisma.fichePreFormationStagiaire.findMany({
          where: { sessionId: session.id },
          include: { contact: true },
        });
      }
      inscriptions = await prisma.inscription.findMany({
        where: { sessionId: session.id },
        include: { contact: true },
        orderBy: { createdAt: "asc" },
      });
    }

    // 4. Historique lié à tous les IDs du prospect
    type OrClause = {
      contactId?: string;
      entrepriseId?: string;
      devisId?: string;
      sessionId?: string;
    };
    const orClauses: OrClause[] = [
      ...(demande.contactId ? [{ contactId: demande.contactId }] : []),
      ...(demande.entrepriseId ? [{ entrepriseId: demande.entrepriseId }] : []),
      ...(demande.devisId ? [{ devisId: demande.devisId }] : []),
      ...(session ? [{ sessionId: session.id }] : []),
    ];

    const historique =
      orClauses.length > 0
        ? await prisma.historiqueAction.findMany({
            where: { OR: orClauses },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : [];

    return NextResponse.json({
      demande,
      contact: demande.contact,
      entreprise: demande.entreprise,
      formation: demande.formation,
      devis: demande.devis,
      session,
      ficheEntreprise,
      fichesStagiaire,
      inscriptions,
      historique,
    });
  }
);
