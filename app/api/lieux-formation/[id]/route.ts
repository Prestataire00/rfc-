export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lieuFormationSchema } from "@/lib/validations/formation";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_: NextRequest, { params }: { params: { id: string } }) => {
  const lieu = await prisma.lieuFormation.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: {
          formation: true,
          formateur: true,
          _count: { select: { inscriptions: true } },
        },
        orderBy: { dateDebut: "desc" },
      },
    },
  });
  if (!lieu) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(lieu);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const data = await parseBody(req, lieuFormationSchema);
  const lieu = await prisma.lieuFormation.update({ where: { id: params.id }, data });
  return NextResponse.json(lieu);
});

export const DELETE = withErrorHandlerParams(async (_: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.lieuFormation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
