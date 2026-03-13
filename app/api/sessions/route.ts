import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionSchema } from "@/lib/validations/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut") ?? "";
  const formationId = searchParams.get("formationId") ?? "";
  const formateurId = searchParams.get("formateurId") ?? "";
  const search = searchParams.get("search") ?? "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const capacite = searchParams.get("capacite"); // "disponible" | "complet"
  const sortBy = searchParams.get("sortBy") ?? "dateDebut";
  const sortOrder = (searchParams.get("sortOrder") ?? "asc") as "asc" | "desc";

  const where = {
    AND: [
      statut ? { statut } : {},
      formationId ? { formationId } : {},
      formateurId ? { formateurId } : {},
      search
        ? {
            OR: [
              { formation: { titre: { contains: search, mode: "insensitive" as const } } },
              { lieu: { contains: search, mode: "insensitive" as const } },
              { formateur: { OR: [
                { nom: { contains: search, mode: "insensitive" as const } },
                { prenom: { contains: search, mode: "insensitive" as const } },
              ] } },
            ],
          }
        : {},
      dateFrom ? { dateDebut: { gte: new Date(dateFrom) } } : {},
      dateTo ? { dateFin: { lte: new Date(dateTo) } } : {},
    ],
  };

  const sessions = await prisma.session.findMany({
    where,
    include: {
      formation: { select: { id: true, titre: true, tarif: true } },
      formateur: { select: { id: true, nom: true, prenom: true } },
      _count: { select: { inscriptions: true } },
    },
    orderBy: sortBy === "formation"
      ? { formation: { titre: sortOrder } }
      : { [sortBy]: sortOrder },
  });

  // Filter by capacity client-side (Prisma can't compare _count vs field)
  let filtered = sessions;
  if (capacite === "disponible") {
    filtered = sessions.filter((s) => s._count.inscriptions < s.capaciteMax);
  } else if (capacite === "complet") {
    filtered = sessions.filter((s) => s._count.inscriptions >= s.capaciteMax);
  }

  // Get distinct formateurs for filter
  const formateurs = await prisma.formateur.findMany({
    select: { id: true, nom: true, prenom: true },
    where: { actif: true },
    orderBy: { nom: "asc" },
  });

  return NextResponse.json({ sessions: filtered, formateurs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { dateDebut, dateFin, formateurId, ...rest } = parsed.data;

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);

  if (fin <= debut) {
    return NextResponse.json({ error: "La date de fin doit etre apres la date de debut" }, { status: 400 });
  }

  const session = await prisma.session.create({
    data: {
      ...rest,
      dateDebut: debut,
      dateFin: fin,
      ...(formateurId ? { formateurId } : {}),
    },
  });
  return NextResponse.json(session, { status: 201 });
}
