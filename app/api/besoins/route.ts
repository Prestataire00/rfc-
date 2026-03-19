import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const besoinSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional().nullable(),
  origine: z.enum(["client", "stagiaire", "centre"]).default("client"),
  statut: z.enum(["nouveau", "qualifie", "propose", "gagne", "perdu"]).default("nouveau"),
  priorite: z.enum(["basse", "normale", "haute", "urgente"]).default("normale"),
  nbStagiaires: z.coerce.number().int().positive().optional().nullable(),
  datesSouhaitees: z.string().optional().nullable(),
  budget: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  entrepriseId: z.string().cuid().optional().nullable(),
  formationId: z.string().cuid().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  const where: any = {};
  if (statut) where.statut = statut;

  const besoins = await prisma.besoinFormation.findMany({
    where,
    include: {
      entreprise: { select: { id: true, nom: true } },
      formation: { select: { id: true, titre: true } },
      devis: { select: { id: true, numero: true, statut: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(besoins);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Nullify empty strings before validation
  const cleaned = { ...body };
  for (const key of ["nbStagiaires", "budget", "entrepriseId", "formationId", "description", "datesSouhaitees", "notes"]) {
    if (cleaned[key] === "") cleaned[key] = null;
  }

  const parsed = besoinSchema.safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const besoin = await prisma.besoinFormation.create({
      data: {
        titre: parsed.data.titre,
        description: parsed.data.description || null,
        origine: parsed.data.origine,
        statut: parsed.data.statut,
        priorite: parsed.data.priorite,
        nbStagiaires: parsed.data.nbStagiaires || null,
        datesSouhaitees: parsed.data.datesSouhaitees || null,
        budget: parsed.data.budget || null,
        notes: parsed.data.notes || null,
        entrepriseId: parsed.data.entrepriseId || null,
        formationId: parsed.data.formationId || null,
      },
    });

    return NextResponse.json(besoin, { status: 201 });
  } catch (err: unknown) {
    console.error("Besoin creation error:", err);
    return NextResponse.json({ error: "Erreur lors de la création du besoin" }, { status: 500 });
  }
}
