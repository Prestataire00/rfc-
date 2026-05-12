// Spec §"Phase 1". GET détail, PATCH (placement zones + signataire), DELETE.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { appendEvent } from "@/lib/signatures/audit-chain";
import { generateToken } from "@/lib/signatures/token";

export const dynamic = "force-dynamic";

type ZoneInput = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  label?: string;
};

type SignataireInput = {
  email: string;
  nom: string;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  return { session };
}

export const GET = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  const { error } = await requireAdmin();
  if (error) return error;
  const request = await prisma.signatureRequest.findUnique({
    where: { id: ctx.params.id },
    include: { zones: true, signataire: true },
  });
  if (!request) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(request);
});

export const PATCH = withErrorHandlerParams<{ id: string }>(async (req: NextRequest, ctx) => {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.signatureRequest.findUnique({
    where: { id: ctx.params.id },
  });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (existing.statut !== "draft" && existing.statut !== "ready") {
    return NextResponse.json(
      { error: `Impossible de modifier une demande en statut ${existing.statut}` },
      { status: 409 },
    );
  }

  const body = (await req.json()) as { zones?: ZoneInput[]; signataire?: SignataireInput };

  // Met à jour les zones (replace all) si fournies.
  if (Array.isArray(body.zones)) {
    await prisma.signatureZone.deleteMany({ where: { requestId: ctx.params.id } });
    if (body.zones.length > 0) {
      await prisma.signatureZone.createMany({
        data: body.zones.map((z) => ({
          requestId: ctx.params.id,
          page: z.page,
          x: z.x,
          y: z.y,
          width: z.width,
          height: z.height,
          type: z.type ?? "signature",
          label: z.label ?? null,
        })),
      });
    }
    await appendEvent(ctx.params.id, {
      type: "zones_placed",
      actorType: "admin",
      actorId: session!.user.id,
      payload: { count: body.zones.length },
    });
  }

  // Upsert signataire si fourni. Rattache automatiquement au Contact existant
  // si l'email correspond exactement (case-insensitive géré côté Postgres `mode: "insensitive"`).
  if (body.signataire?.email && body.signataire?.nom) {
    const contact = await prisma.contact.findFirst({
      where: { email: { equals: body.signataire.email, mode: "insensitive" } },
      select: { id: true },
    });
    // Token provisoire — sera regénéré au moment de l'envoi (POST /send Sprint 3).
    // On en stocke un dès maintenant pour respecter la contrainte @unique tokenHash.
    const provisional = generateToken();
    await prisma.signataire.upsert({
      where: { requestId: ctx.params.id },
      create: {
        requestId: ctx.params.id,
        email: body.signataire.email,
        nom: body.signataire.nom,
        contactId: contact?.id ?? null,
        tokenHash: provisional.tokenHash,
      },
      update: {
        email: body.signataire.email,
        nom: body.signataire.nom,
        contactId: contact?.id ?? null,
      },
    });
  }

  // Transition draft → ready dès qu'il y a au moins une zone.
  if (body.zones && body.zones.length > 0 && existing.statut === "draft") {
    await prisma.signatureRequest.update({
      where: { id: ctx.params.id },
      data: { statut: "ready" },
    });
  }

  const updated = await prisma.signatureRequest.findUnique({
    where: { id: ctx.params.id },
    include: { zones: true, signataire: true },
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  const { error } = await requireAdmin();
  if (error) return error;
  const existing = await prisma.signatureRequest.findUnique({
    where: { id: ctx.params.id },
  });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (existing.statut === "completed" || existing.statut === "signed") {
    return NextResponse.json(
      { error: "Impossible de supprimer une demande signée/finalisée" },
      { status: 409 },
    );
  }
  await prisma.signatureRequest.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
});
