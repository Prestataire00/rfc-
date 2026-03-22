export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let params = await prisma.parametres.findUnique({ where: { id: "default" } });
    if (!params) {
      params = await prisma.parametres.create({ data: { id: "default" } });
    }
    return NextResponse.json(params);
  } catch (err: unknown) {
    console.error("Erreur GET parametres:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des paramètres" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const params = await prisma.parametres.upsert({
      where: { id: "default" },
      create: { id: "default", ...body },
      update: body,
    });
    return NextResponse.json(params);
  } catch (err: unknown) {
    console.error("Erreur PUT parametres:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour des paramètres" }, { status: 500 });
  }
}
