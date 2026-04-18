export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/classes-virtuelles/[sessionId]
export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const cv = await prisma.classeVirtuelle.findUnique({ where: { sessionId: params.sessionId } });
    if (!cv) return NextResponse.json(null);
    return NextResponse.json(cv);
  } catch (err) {
    console.error("GET classes-virtuelles:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// PUT /api/classes-virtuelles/[sessionId] — creer ou mettre a jour
export async function PUT(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const body = await req.json();
    const cv = await prisma.classeVirtuelle.upsert({
      where: { sessionId: params.sessionId },
      create: {
        sessionId: params.sessionId,
        lienVisio: body.lienVisio || null,
        plateformeVisio: body.plateformeVisio || null,
        enregistrementUrl: body.enregistrementUrl || null,
        enregistrementDisponibleJusqua: body.enregistrementDisponibleJusqua
          ? new Date(body.enregistrementDisponibleJusqua)
          : null,
        ressources: typeof body.ressources === "string"
          ? body.ressources
          : JSON.stringify(body.ressources || []),
        notes: body.notes || null,
      },
      update: {
        lienVisio: body.lienVisio ?? undefined,
        plateformeVisio: body.plateformeVisio ?? undefined,
        enregistrementUrl: body.enregistrementUrl ?? undefined,
        enregistrementDisponibleJusqua: body.enregistrementDisponibleJusqua !== undefined
          ? (body.enregistrementDisponibleJusqua ? new Date(body.enregistrementDisponibleJusqua) : null)
          : undefined,
        ressources: body.ressources !== undefined
          ? (typeof body.ressources === "string" ? body.ressources : JSON.stringify(body.ressources))
          : undefined,
        notes: body.notes ?? undefined,
      },
    });
    return NextResponse.json(cv);
  } catch (err) {
    console.error("PUT classes-virtuelles:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
