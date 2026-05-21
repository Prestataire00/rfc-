export const dynamic = "force-dynamic";

// GET  /api/modeles-document  — liste les modeles actifs (recents en tete)
// POST /api/modeles-document  — cree un nouveau modele de document IA

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { modeleDocumentSaveSchema } from "@/lib/validations/modele-document";

export const GET = withErrorHandler(async () => {
  const modeles = await prisma.modeleDocumentIA.findMany({
    where: { actif: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(modeles);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const data = modeleDocumentSaveSchema.parse(body);

  const modele = await prisma.modeleDocumentIA.create({
    data: {
      nom: data.nom,
      description: data.description ?? null,
      titre: data.titre,
      introduction: data.introduction ?? null,
      corps: data.corps,
      mentions: data.mentions ?? null,
      variables: JSON.stringify(data.variables ?? []),
    },
  });

  return NextResponse.json(modele, { status: 201 });
});
