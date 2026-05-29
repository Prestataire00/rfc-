// POST /api/admin/clean-ia-mentions
//
// Migration one-shot rétroactive : retire les mentions « IA » des notes
// des devis créés AVANT le commit fda7aa7 (qui a corrigé la génération
// pour ne plus les inclure).
//
// Substitutions appliquées :
//   « généré par IA depuis »  →  « généré depuis »
//   « Justification IA : »     →  « Justification : »
//
// Idempotent : peut être appelée plusieurs fois sans effet supplémentaire.
// Admin uniquement. Renvoie le nombre de devis modifiés.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const POST = withErrorHandler(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Charge les devis impactés (notes contenant l'une des deux phrases).
  // Volume attendu très faible (quelques dizaines max), pas besoin de batcher.
  const devisATraiter = await prisma.devis.findMany({
    where: {
      OR: [
        { notes: { contains: "généré par IA" } },
        { notes: { contains: "Justification IA" } },
      ],
    },
    select: { id: true, notes: true },
  });

  let modifies = 0;
  for (const d of devisATraiter) {
    if (!d.notes) continue;
    const nouvellesNotes = d.notes
      .replace(/généré par IA depuis/g, "généré depuis")
      .replace(/Justification IA\s*:/g, "Justification :");
    if (nouvellesNotes !== d.notes) {
      await prisma.devis.update({
        where: { id: d.id },
        data: { notes: nouvellesNotes },
      });
      modifies++;
    }
  }

  return NextResponse.json({
    ok: true,
    examines: devisATraiter.length,
    modifies,
  });
});
