export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisSchema } from "@/lib/validations/devis";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { logAction } from "@/lib/historique";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { logger } from "@/lib/logger";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));

  const where = statut ? { statut } : {};

  const [devis, total] = await Promise.all([
    prisma.devis.findMany({
      where,
      include: {
        entreprise: { select: { id: true, nom: true } },
        contact: { select: { id: true, nom: true, prenom: true } },
        lignes: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.devis.count({ where }),
  ]);

  return NextResponse.json({
    data: devis,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const parsed = await parseBody(req, devisSchema);

  const allDevis = await prisma.devis.findMany({ select: { numero: true } });
  const maxNum = allDevis.reduce((max, d) => {
    const n = parseInt(d.numero.split("-").pop() || "0");
    return n > max ? n : max;
  }, 0);
  const numero = generateNumero("DEV", maxNum);

  const { lignes, dateValidite, entrepriseId, contactId, tauxTVA, ...rest } = parsed;
  const montantHT = lignes.reduce((sum, l) => sum + l.montant, 0);
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  const devis = await prisma.devis.create({
    data: {
      ...rest,
      numero,
      tauxTVA,
      montantHT,
      montantTTC,
      dateValidite: new Date(dateValidite),
      entrepriseId: entrepriseId || null,
      contactId: contactId || null,
      lignes: { create: lignes.map(({ id: _, ...l }) => l) },
    },
    include: { lignes: true },
  });

  try {
    await logAction({
      action: "devis_cree",
      label: "Devis " + numero + " créé (" + formatCurrency(montantTTC) + ")",
      lien: "/commercial/devis/" + devis.id,
      entrepriseId: devis.entrepriseId ?? undefined,
      contactId: devis.contactId ?? undefined,
      devisId: devis.id,
    });
  } catch (logErr) {
    logger.warn("historique.devis_cree_failed", { error: String(logErr) });
  }

  return NextResponse.json(devis, { status: 201 });
});
