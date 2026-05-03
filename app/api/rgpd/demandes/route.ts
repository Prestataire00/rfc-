export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  type: z.string().min(1),
  demandeurEmail: z.string().email(),
  demandeurNom: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  justificatif: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (statut) where.statut = statut;
  if (type) where.type = type;

  const items = await prisma.demandeRgpd.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

// NOTE : la POST publique anonyme n'est pas activee — le middleware actuel bloque
// toute requete /api/* non authentifiee. A activer en Phase 3 via whitelist
// /api/rgpd/demandes dans middleware.isPublicPath() avec rate limiting.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.demandeRgpd.create({
    data: {
      type: body.type,
      demandeurEmail: body.demandeurEmail,
      demandeurNom: body.demandeurNom ?? null,
      description: body.description ?? null,
      justificatif: body.justificatif ?? null,
      statut: "recue",
    },
  });
  return NextResponse.json(item, { status: 201 });
});
