export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lieuFormationSchema } from "@/lib/validations/formation";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const actif = searchParams.get("actif");

  const where = {
    AND: [
      search
        ? {
            OR: [
              { nom: { contains: search, mode: "insensitive" as const } },
              { ville: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      actif !== null && actif !== "" ? { actif: actif === "true" } : {},
    ],
  };

  const lieux = await prisma.lieuFormation.findMany({
    where,
    include: { _count: { select: { sessions: true } } },
    orderBy: { nom: "asc" },
  });

  return NextResponse.json({ lieux });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const data = await parseBody(req, lieuFormationSchema);
  const lieu = await prisma.lieuFormation.create({ data });
  return NextResponse.json(lieu, { status: 201 });
});
