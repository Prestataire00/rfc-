export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formateurSchema } from "@/lib/validations/formateur";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const dateDebutParam = searchParams.get("dateDebut");
  const dateFinParam = searchParams.get("dateFin");

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
    include: {
      _count: { select: { sessions: true } },
      // Le user lié (rel 1:1 optionnelle) — sert à l'assignation de tâches
      // qui pointent sur TaskItem.userId (= User.id). Sans User lié, le
      // formateur ne peut pas se voir assigner des tâches dans l'app.
      user: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calcul de la disponibilite si periode fournie
  if (dateDebutParam && dateFinParam) {
    const dateDebut = new Date(dateDebutParam);
    const dateFin = new Date(dateFinParam);

    if (!isNaN(dateDebut.getTime()) && !isNaN(dateFin.getTime())) {
      const formateurIds = formateurs.map((f) => f.id);

      // Sessions chevauchant la periode (autres sessions, conflit potentiel)
      const overlappingSessions = await prisma.session.findMany({
        where: {
          formateurId: { in: formateurIds },
          dateDebut: { lt: dateFin },
          dateFin: { gt: dateDebut },
        },
        select: { id: true, formateurId: true },
      });

      // Disponibilites couvrant la periode
      const disponibilites = await prisma.disponibilite.findMany({
        where: {
          formateurId: { in: formateurIds },
          dateDebut: { lte: dateDebut },
          dateFin: { gte: dateFin },
        },
        select: { formateurId: true, type: true },
      });

      const sessionsByFormateur = new Map<string, number>();
      for (const s of overlappingSessions) {
        if (!s.formateurId) continue;
        sessionsByFormateur.set(s.formateurId, (sessionsByFormateur.get(s.formateurId) ?? 0) + 1);
      }

      const dispoByFormateur = new Map<string, string>();
      for (const d of disponibilites) {
        // Ne pas ecraser si deja present (premier match suffit)
        if (!dispoByFormateur.has(d.formateurId)) {
          dispoByFormateur.set(d.formateurId, d.type);
        }
      }

      const enriched = formateurs.map((f) => {
        let disponibilite: "disponible" | "indisponible" | "conflit" | "inconnu" = "inconnu";
        if ((sessionsByFormateur.get(f.id) ?? 0) > 0) {
          disponibilite = "conflit";
        } else {
          const t = dispoByFormateur.get(f.id);
          if (t === "indisponible") disponibilite = "indisponible";
          else if (t === "disponible") disponibilite = "disponible";
        }
        return { ...f, disponibilite };
      });

      return NextResponse.json(enriched);
    }
  }

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
