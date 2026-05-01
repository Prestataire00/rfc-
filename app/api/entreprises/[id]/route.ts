export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrepriseSchema } from "@/lib/validations/entreprise";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: params.id },
    include: {
      contacts: true,
      devis: { orderBy: { createdAt: "desc" }, include: { sessions: { select: { id: true } }, contact: { select: { email: true } } } },
      factures: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!entreprise) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(entreprise);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const parsed = await parseBody(req, entrepriseSchema);

  const data = {
    nom: parsed.nom,
    siret: parsed.siret || null,
    email: parsed.email || null,
    telephone: parsed.telephone || null,
    site: parsed.site || null,
    secteur: parsed.secteur || null,
    adresse: parsed.adresse || null,
    ville: parsed.ville || null,
    codePostal: parsed.codePostal || null,
    notes: parsed.notes || null,
  };

  const entreprise = await prisma.entreprise.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(entreprise);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.entreprise.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
