export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/utils";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { factureSchema } from "@/lib/validations/facture";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));

  const where = statut ? { statut } : {};

  // Audit 2026-05-19 §4.12 : select explicite — on n'inclut pas paiements
  // (JSON volumineux) ni notes sur la liste. /api/factures/[id] les expose.
  const [factures, total] = await Promise.all([
    prisma.facture.findMany({
      where,
      select: {
        id: true,
        numero: true,
        montantHT: true,
        montantTTC: true,
        tauxTVA: true,
        dateEmission: true,
        dateEcheance: true,
        statut: true,
        createdAt: true,
        devisId: true,
        entrepriseId: true,
        entreprise: { select: { id: true, nom: true } },
        devis: { select: { id: true, numero: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facture.count({ where }),
  ]);

  return NextResponse.json({
    data: factures,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Audit 2026-05-19 §4.9 : validation Zod du body (factureSchema).
  const body = await parseBody(req, factureSchema);
  const allFactures = await prisma.facture.findMany({ select: { numero: true } });
  const maxNum = allFactures.reduce((max, f) => {
    const n = parseInt(f.numero.split("-").pop() || "0");
    return n > max ? n : max;
  }, 0);
  const numero = generateNumero("FAC", maxNum);

  const facture = await prisma.facture.create({
    data: {
      numero,
      montantHT: body.montantHT,
      tauxTVA: body.tauxTVA ?? 20,
      montantTTC: body.montantTTC,
      dateEmission: body.dateEmission ? new Date(body.dateEmission) : new Date(),
      dateEcheance: new Date(body.dateEcheance),
      notes: body.notes || null,
      statut: body.statut || "en_attente",
      devisId: body.devisId || null,
      entrepriseId: body.entrepriseId || null,
      // Rattachement projet (bilatéralité projet ↔ facture). Si on vient de
      // /commercial/factures/nouveau?projetId=X, la facture apparaîtra aussi
      // dans l'onglet Finance du projet.
      projetId: body.projetId || null,
    },
  });
  return NextResponse.json(facture, { status: 201 });
});
