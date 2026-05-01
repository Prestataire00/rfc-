export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formationSchema } from "@/lib/validations/formation";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const formation = await prisma.formation.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: {
          formateur: true,
          lieuFormation: true,
          _count: { select: { inscriptions: true } },
        },
        orderBy: { dateDebut: "desc" },
      },
    },
  });
  if (!formation) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(formation);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const parsed = await parsePartialBody(req, formationSchema);
  const cleanData = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined)
  );
  const formation = await prisma.formation.update({
    where: { id: params.id },
    data: cleanData,
  });
  return NextResponse.json(formation);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.formation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
