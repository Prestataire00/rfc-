export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/competences/formateur/[formateurId] — competences d'un formateur
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { formateurId: string } }) => {
  const competences = await prisma.formateurCompetence.findMany({
    where: { formateurId: params.formateurId },
    include: { competence: true },
    orderBy: { competence: { nom: "asc" } },
  });
  return NextResponse.json(competences);
});

// POST /api/competences/formateur/[formateurId] — ajouter/mettre a jour une competence
// Body: { competenceId, niveau, justificatifUrl?, dateObtention?, dateExpiration? }
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { formateurId: string } }) => {
  const body = await req.json();
  if (!body.competenceId) return NextResponse.json({ error: "competenceId requis" }, { status: 400 });

  const comp = await prisma.formateurCompetence.upsert({
    where: {
      formateurId_competenceId: { formateurId: params.formateurId, competenceId: body.competenceId },
    },
    create: {
      formateurId: params.formateurId,
      competenceId: body.competenceId,
      niveau: body.niveau || "intermediaire",
      justificatifUrl: body.justificatifUrl || null,
      dateObtention: body.dateObtention ? new Date(body.dateObtention) : null,
      dateExpiration: body.dateExpiration ? new Date(body.dateExpiration) : null,
    },
    update: {
      niveau: body.niveau ?? undefined,
      justificatifUrl: body.justificatifUrl ?? undefined,
      dateObtention: body.dateObtention ? new Date(body.dateObtention) : undefined,
      dateExpiration: body.dateExpiration ? new Date(body.dateExpiration) : undefined,
    },
  });
  return NextResponse.json(comp);
});

// PUT /api/competences/formateur/[formateurId] — validation admin
// Body: { competenceId, valideParAdmin: true }
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { formateurId: string } }) => {
  const body = await req.json();
  if (!body.competenceId) return NextResponse.json({ error: "competenceId requis" }, { status: 400 });

  const comp = await prisma.formateurCompetence.update({
    where: {
      formateurId_competenceId: { formateurId: params.formateurId, competenceId: body.competenceId },
    },
    data: {
      valideParAdmin: body.valideParAdmin ?? undefined,
      dateValidation: body.valideParAdmin ? new Date() : undefined,
    },
  });
  return NextResponse.json(comp);
});
