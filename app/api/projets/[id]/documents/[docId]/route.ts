// PATCH /api/projets/[id]/documents/[docId] : modifie la visibilité, le nom, le type, etc.
// DELETE : supprime le document (admin uniquement).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  nom: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  visibleClient: z.boolean().optional(),
  visibleFormateur: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}

export const PATCH = withErrorHandlerParams<{ id: string; docId: string }>(
  async (req: NextRequest, ctx) => {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const existing = await prisma.document.findUnique({
      where: { id: ctx.params.docId },
      select: { id: true, projetId: true },
    });
    if (!existing || existing.projetId !== ctx.params.id) {
      return NextResponse.json({ error: "Document introuvable pour ce projet" }, { status: 404 });
    }

    const body = await parsePartialBody(req, updateSchema);
    const doc = await prisma.document.update({
      where: { id: ctx.params.docId },
      data: body,
    });
    return NextResponse.json(doc);
  },
);

export const DELETE = withErrorHandlerParams<{ id: string; docId: string }>(
  async (_req, ctx) => {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const existing = await prisma.document.findUnique({
      where: { id: ctx.params.docId },
      select: { id: true, projetId: true },
    });
    if (!existing || existing.projetId !== ctx.params.id) {
      return NextResponse.json({ error: "Document introuvable pour ce projet" }, { status: 404 });
    }

    await prisma.document.delete({ where: { id: ctx.params.docId } });
    return NextResponse.json({ ok: true });
  },
);
