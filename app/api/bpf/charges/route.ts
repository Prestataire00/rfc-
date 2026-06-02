// GET /api/bpf/charges?annee=2026  → renvoie les charges saisies pour l'exercice
// PUT /api/bpf/charges                → upsert des charges d'un exercice
//
// Les charges du Cerfa 10443*17 (cadre C) ne sont pas dérivables automatiquement
// depuis le SI commercial (loyers, salaires, impôts, etc.). Elles doivent être
// saisies manuellement par l'OF avant la télédéclaration sur Démarches Simplifiées.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

const bodySchema = z.object({
  annee: z.number().int().min(2000).max(2100),
  c1Achats: z.number().min(0).default(0),
  c2Services: z.number().min(0).default(0),
  c3AutresCharges: z.number().min(0).default(0),
  c4Impots: z.number().min(0).default(0),
  c5Salaires: z.number().min(0).default(0),
  c6Autres: z.number().min(0).default(0),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const annee = Number(new URL(req.url).searchParams.get("annee")) || new Date().getFullYear();
  const row = await prisma.bpfCharges.findUnique({ where: { annee } });
  return NextResponse.json(
    row ?? {
      annee,
      c1Achats: 0,
      c2Services: 0,
      c3AutresCharges: 0,
      c4Impots: 0,
      c5Salaires: 0,
      c6Autres: 0,
    },
  );
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres invalides", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { annee, ...charges } = parsed.data;
  const row = await prisma.bpfCharges.upsert({
    where: { annee },
    create: { annee, ...charges },
    update: charges,
  });
  return NextResponse.json(row);
});
