export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.entrepriseId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [factures, parametres] = await Promise.all([
    prisma.facture.findMany({
      where: {
        entrepriseId: session.user.entrepriseId,
        statut: { not: "payee" },
      },
      orderBy: { dateEcheance: "asc" },
      select: {
        id: true,
        numero: true,
        statut: true,
        montantTTC: true,
        dateEcheance: true,
        dateEmission: true,
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  return NextResponse.json({ factures, parametres });
});
