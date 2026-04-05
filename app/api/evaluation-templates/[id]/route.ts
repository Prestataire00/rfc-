export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = await prisma.evaluationTemplate.findUnique({ where: { id: params.id } });
    if (!template) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(template);
  } catch (err) {
    console.error("GET template:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { nom, description, type, questions } = body;

    const template = await prisma.evaluationTemplate.update({
      where: { id: params.id },
      data: {
        nom,
        description: description || null,
        type: type || "custom",
        questions: JSON.stringify(questions || []),
      },
    });
    return NextResponse.json(template);
  } catch (err) {
    console.error("PUT template:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.evaluationTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE template:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
