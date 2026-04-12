export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const presetParam = searchParams.get("preset");
    const type = searchParams.get("type");

    const where: { preset?: boolean; type?: string } = {};
    if (presetParam === "true") where.preset = true;
    if (presetParam === "false") where.preset = false;
    if (type) where.type = type;

    const templates = await prisma.evaluationTemplate.findMany({
      where,
      orderBy: [{ preset: "desc" }, { ordre: "asc" }, { createdAt: "desc" }],
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
    const { nom, description, type, questions, icon } = body;
    if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const template = await prisma.evaluationTemplate.create({
      data: {
        id: "custom_" + randomUUID(),
        nom,
        description: description || null,
        type: type || "custom",
        questions: JSON.stringify(questions || []),
        icon: icon || null,
        preset: false, // Toujours false via l'API publique
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("POST template:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
