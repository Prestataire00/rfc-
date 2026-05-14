export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { ensureFormateurId } from "@/lib/formateur/ensure-formateur";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  sessionId: z.string().optional().nullable(),
  montantHT: z.number().nonnegative(),
  tauxTVA: z.number().nonnegative().optional(),
  montantTTC: z.number().nonnegative(),
  datePrestation: z.string(),
  fichierUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function pad(n: number, len = 4): string {
  return String(n).padStart(len, "0");
}

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formateurId = await ensureFormateurId(session);
  if (!formateurId) return NextResponse.json([]);

  const items = await prisma.factureFormateur.findMany({
    where: { formateurId },
    include: {
      session: {
        select: {
          id: true,
          dateDebut: true,
          formation: { select: { titre: true } },
        },
      },
    },
    orderBy: { dateEmission: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formateurId = await ensureFormateurId(session);
  if (!formateurId) {
    return NextResponse.json(
      { error: "Impossible de résoudre la fiche formateur" },
      { status: 400 },
    );
  }

  const body = await parseBody(req, createSchema);

  // RBAC : si sessionId fourni, vérifier que le formateur est bien sur cette session.
  if (body.sessionId) {
    const sess = await prisma.session.findUnique({
      where: { id: body.sessionId },
      select: { formateurId: true },
    });
    if (!sess || sess.formateurId !== formateurId) {
      return NextResponse.json(
        { error: "Session non attribuée à ce formateur" },
        { status: 403 },
      );
    }
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1, 2);
  const prefix = `FAC-FORM-${yyyy}-${mm}-`;
  const count = await prisma.factureFormateur.count({
    where: { numero: { startsWith: prefix } },
  });
  const numero = `${prefix}${pad(count + 1)}`;

  const item = await prisma.factureFormateur.create({
    data: {
      numero,
      formateurId,
      sessionId: body.sessionId ?? null,
      montantHT: body.montantHT,
      tauxTVA: body.tauxTVA ?? 20,
      montantTTC: body.montantTTC,
      datePrestation: new Date(body.datePrestation),
      dateEmission: new Date(),
      // Statut imposé : un formateur soumet, l'admin valide / paie.
      statut: "a_payer",
      fichierUrl: body.fichierUrl ?? null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
