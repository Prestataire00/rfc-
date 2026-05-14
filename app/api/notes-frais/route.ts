export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-wrapper";
import { ensureFormateurId } from "@/lib/formateur/ensure-formateur";

// GET /api/notes-frais — liste les notes (formateur: les siennes, admin: toutes)
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const statut = new URL(req.url).searchParams.get("statut");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (statut) where.statut = statut;

  // Formateur : ses propres notes uniquement. ensureFormateurId auto-crée
  // la fiche si manquante (cas des comptes formateur sans liaison).
  if (session.user.role === "formateur") {
    const formateurId = await ensureFormateurId(session);
    if (!formateurId) return NextResponse.json([]);
    where.formateurId = formateurId;
  }

  const notes = await prisma.noteFrais.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { formateur: { select: { nom: true, prenom: true } } },
  });
  return NextResponse.json(notes);
});

// POST /api/notes-frais — creer une note de frais
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await req.json();
  // RBAC : un formateur ne peut JAMAIS créer une note pour un autre que
  // lui-même. On force le formateurId depuis la session (et on auto-crée
  // la fiche si manquante). Pour admin, on trust le body.
  let formateurId: string | null;
  if (session.user.role === "formateur") {
    formateurId = await ensureFormateurId(session);
  } else {
    formateurId = body.formateurId || null;
  }
  if (!formateurId) {
    return NextResponse.json(
      { error: "Impossible de résoudre la fiche formateur" },
      { status: 400 },
    );
  }

  const note = await prisma.noteFrais.create({
    data: {
      formateurId,
      sessionId: body.sessionId || null,
      categorie: body.categorie || "autre",
      description: body.description || "",
      montant: body.montant || 0,
      date: body.date ? new Date(body.date) : new Date(),
      lieu: body.lieu || null,
      justificatifUrl: body.justificatifUrl || null,
      justificatifNom: body.justificatifNom || null,
    },
  });
  return NextResponse.json(note, { status: 201 });
});
