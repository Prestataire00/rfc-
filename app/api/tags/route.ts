export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

const tagCreateSchema = z.object({
  nom: z.string().min(1, "Nom requis").max(60),
  couleur: z.string().max(20).optional().nullable(),
});

const tagAssignSchema = z.object({
  action: z.enum(["add", "remove"]),
  tagId: z.string().min(1, "tagId requis"),
  contactId: z.string().optional().nullable(),
  entrepriseId: z.string().optional().nullable(),
});

// GET /api/tags — liste tous les tags avec le nombre de contacts/entreprises
export const GET = withErrorHandler(async () => {
  const tags = await prisma.tag.findMany({
    orderBy: { nom: "asc" },
    include: {
      _count: { select: { contacts: true, entreprises: true } },
    },
  });
  return NextResponse.json(tags);
});

// POST /api/tags — creer un tag
// Le wrapper convertit P2002 (unique constraint) en 409.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = tagCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { nom, couleur } = parsed.data;
  const tag = await prisma.tag.create({ data: { nom, couleur: couleur || "#6b7280" } });
  return NextResponse.json(tag, { status: 201 });
});

// DELETE /api/tags?id=xxx — supprimer un tag
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

// PUT /api/tags — assigner/retirer un tag a un contact ou entreprise
// Body: { action: "add"|"remove", tagId, contactId?, entrepriseId? }
export const PUT = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = tagAssignSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { action, tagId, contactId, entrepriseId } = parsed.data;
  if (!contactId && !entrepriseId) {
    return NextResponse.json({ error: "contactId ou entrepriseId requis" }, { status: 400 });
  }

  if (action === "add") {
    if (contactId) {
      await prisma.contactTag.upsert({
        where: { contactId_tagId: { contactId, tagId } },
        create: { contactId, tagId },
        update: {},
      });
    }
    if (entrepriseId) {
      await prisma.entrepriseTag.upsert({
        where: { entrepriseId_tagId: { entrepriseId, tagId } },
        create: { entrepriseId, tagId },
        update: {},
      });
    }
  } else if (action === "remove") {
    if (contactId) {
      await prisma.contactTag.deleteMany({ where: { contactId, tagId } });
    }
    if (entrepriseId) {
      await prisma.entrepriseTag.deleteMany({ where: { entrepriseId, tagId } });
    }
  }

  return NextResponse.json({ ok: true });
});
