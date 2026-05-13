export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formateurId = (session.user as { formateurId?: string | null }).formateurId;
  if (!formateurId) return NextResponse.json([]);

  // Projets assignés au formateur (via ProjetFormateur). Sert au filtre
  // visibleFormateur : un doc projet n'est exposé au formateur QUE s'il est
  // assigné au projet en question.
  const projetFormateurs = await prisma.projetFormateur.findMany({
    where: { formateurId },
    select: { projetId: true },
  });
  const projetIds = projetFormateurs.map((pf) => pf.projetId);

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        // Cas legacy : document directement rattaché au formateur (signatures
        // de convention de sous-traitance, CV, etc.).
        { formateurId },
        // Cas projet : admin a coché "visible formateur" + le formateur est
        // bien assigné au projet du document.
        ...(projetIds.length > 0
          ? [{ visibleFormateur: true, projetId: { in: projetIds } }]
          : []),
      ],
    },
    include: {
      session: { include: { formation: { select: { titre: true } } } },
      projet: { select: { id: true, nom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
});
