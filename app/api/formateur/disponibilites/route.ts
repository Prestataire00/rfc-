export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "formateur") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formateurId = session.user.formateurId;
    if (!formateurId) return NextResponse.json([]);

    const disponibilites = await prisma.disponibilite.findMany({
      where: { formateurId },
      orderBy: { dateDebut: "asc" },
    });

    return NextResponse.json(disponibilites);
  } catch (err: unknown) {
    console.error("Erreur GET disponibilités:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des disponibilités" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "formateur") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formateurId = session.user.formateurId;
    if (!formateurId) return NextResponse.json({ error: "No formateur linked" }, { status: 400 });

    const body = await req.json();

    const dispo = await prisma.disponibilite.create({
      data: {
        formateurId,
        dateDebut: new Date(body.dateDebut),
        dateFin: new Date(body.dateFin),
        type: body.type || "disponible",
        notes: body.notes || null,
      },
    });

    return NextResponse.json(dispo, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST disponibilité:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la disponibilité" }, { status: 500 });
  }
}
