export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.evaluationTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (err) {
    console.error("GET templates:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, description, type, questions } = body;
    if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const template = await prisma.evaluationTemplate.create({
      data: {
        nom,
        description: description || null,
        type: type || "custom",
        questions: JSON.stringify(questions || []),
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("POST template:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
