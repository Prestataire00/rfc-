export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formateurSchema } from "@/lib/validations/formateur";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const formateurs = await prisma.formateur.findMany({
    where: search
      ? {
          OR: [
            { nom: { contains: search } },
            { prenom: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {},
    include: { _count: { select: { sessions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(formateurs);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const parsed = await parseBody(req, formateurSchema);

  const { specialites, ...rest } = parsed;
  const formateur = await prisma.formateur.create({
    data: { ...rest, specialites: JSON.stringify(specialites) },
  });
  return NextResponse.json(formateur, { status: 201 });
});
