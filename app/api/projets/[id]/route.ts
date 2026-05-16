export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { projetUpdateSchema } from "@/lib/validations/projet";
import { aggregateProjet } from "@/lib/projets/aggregate";

/**
 * GET /api/projets/[id]
 *
 * Détail enrichi : projet + relations + KPIs agrégés.
 */
export const GET = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const projet = await prisma.projet.findUnique({
      where: { id: params.id },
      include: {
        entreprise: {
          select: { id: true, nom: true, ville: true, email: true, telephone: true },
        },
        formateurs: {
          include: {
            formateur: {
              select: { id: true, nom: true, prenom: true, email: true, tarifJournalier: true },
            },
          },
        },
        demandes: {
          select: {
            id: true,
            titre: true,
            statut: true,
            priorite: true,
            nbStagiaires: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        devis: {
          select: {
            id: true,
            numero: true,
            objet: true,
            montantTTC: true,
            statut: true,
            dateEmission: true,
            dateSigne: true,
          },
          orderBy: { dateEmission: "desc" },
        },
        sessions: {
          select: {
            id: true,
            dateDebut: true,
            dateFin: true,
            statut: true,
            lieu: true,
            formation: { select: { titre: true, duree: true } },
            formateur: { select: { id: true, nom: true, prenom: true } },
            _count: { select: { inscriptions: true } },
          },
          orderBy: { dateDebut: "asc" },
        },
        factures: {
          select: {
            id: true,
            numero: true,
            montantTTC: true,
            statut: true,
            dateEmission: true,
            dateEcheance: true,
            datePaiement: true,
          },
          orderBy: { dateEmission: "desc" },
        },
      },
    });

    if (!projet) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const kpis = aggregateProjet({
      statut: projet.statut,
      budget: projet.budget,
      dateFinPrevue: projet.dateFinPrevue,
      besoins: projet.demandes.map((b) => ({ statut: b.statut })),
      devis: projet.devis.map((d) => ({
        statut: d.statut,
        montantTTC: d.montantTTC,
      })),
      sessions: projet.sessions.map((s) => ({
        statut: s.statut,
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
      })),
      factures: projet.factures.map((f) => ({
        statut: f.statut,
        montantTTC: f.montantTTC,
      })),
    });

    return NextResponse.json({ ...projet, kpis });
  },
);

/**
 * PUT /api/projets/[id]
 *
 * Mise à jour partielle. Pour la liste de formateurs, on remplace
 * entièrement (delete-all + recreate) — plus simple à raisonner qu'un
 * diff. Pour des projets avec 100+ formateurs ça poserait problème, ici
 * on en a moins de 10 par projet.
 */
export const PUT = withErrorHandlerParams(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const body = await req.json();
    const parsed = projetUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", issues: parsed.error.issues },
        { status: 422 },
      );
    }
    const data = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (data.nom !== undefined) updateData.nom = data.nom;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.statut !== undefined) updateData.statut = data.statut;
    if (data.priorite !== undefined) updateData.priorite = data.priorite;
    if (data.dateDebut !== undefined)
      updateData.dateDebut = data.dateDebut ? new Date(data.dateDebut) : null;
    if (data.dateFinPrevue !== undefined)
      updateData.dateFinPrevue = data.dateFinPrevue
        ? new Date(data.dateFinPrevue)
        : null;
    if (data.dateFinReelle !== undefined)
      updateData.dateFinReelle = data.dateFinReelle
        ? new Date(data.dateFinReelle)
        : null;
    if (data.chefProjet !== undefined) updateData.chefProjet = data.chefProjet;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.objectifs !== undefined) updateData.objectifs = data.objectifs;
    if (data.livrables !== undefined) updateData.livrables = data.livrables;
    if (data.entrepriseId !== undefined)
      updateData.entrepriseId = data.entrepriseId;

    // Transition automatique : si statut=termine et dateFinReelle absent, set
    // automatiquement à now. Le caller peut override en passant explicitement
    // dateFinReelle.
    if (data.statut === "termine" && data.dateFinReelle === undefined) {
      updateData.dateFinReelle = new Date();
    }

    // Sync formateurs si la liste est fournie
    if (data.formateurIds !== undefined) {
      await prisma.$transaction([
        prisma.projetFormateur.deleteMany({ where: { projetId: params.id } }),
        prisma.projet.update({
          where: { id: params.id },
          data: {
            ...updateData,
            formateurs: {
              create: data.formateurIds.map((formateurId) => ({ formateurId })),
            },
          },
        }),
      ]);
    } else {
      await prisma.projet.update({ where: { id: params.id }, data: updateData });
    }

    const updated = await prisma.projet.findUnique({
      where: { id: params.id },
      include: {
        entreprise: { select: { id: true, nom: true } },
        formateurs: { include: { formateur: true } },
      },
    });

    return NextResponse.json(updated);
  },
);

/**
 * DELETE /api/projets/[id]
 *
 * **Soft delete** par défaut : passe le statut à "archive" — préserve les
 * relations historiques (devis/factures/sessions qui réfèrent le projet).
 * Pour un hard delete on enlèverait explicitement (réservé admin).
 */
export const DELETE = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await prisma.projet.update({
      where: { id: params.id },
      data: { statut: "archive" },
    });
    return NextResponse.json({ success: true });
  },
);
