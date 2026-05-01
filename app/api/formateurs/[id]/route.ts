export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formateurSchema } from "@/lib/validations/formateur";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const formateur = await prisma.formateur.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: { formation: true },
        orderBy: { dateDebut: "desc" },
      },
    },
  });
  if (!formateur) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(formateur);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const parsed = await parseBody(req, formateurSchema);
  const { specialites, ...rest } = parsed;
  const formateur = await prisma.formateur.update({
    where: { id: params.id },
    data: { ...rest, specialites: JSON.stringify(specialites) },
  });
  return NextResponse.json(formateur);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.formateur.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
