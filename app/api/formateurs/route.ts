export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formateurSchema } from "@/lib/validations/formateur";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const formateurs = await prisma.formateur.findMany({
      where: search
        ? {
            OR: [
              { nom: { contains: search } },
              { prenom: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {},
      include: { _count: { select: { sessions: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(formateurs);
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des formateurs:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des formateurs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = formateurSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { specialites, ...rest } = parsed.data;
  try {
    const formateur = await prisma.formateur.create({
      data: { ...rest, specialites: JSON.stringify(specialites) },
    });
    return NextResponse.json(formateur, { status: 201 });
  } catch (err: unknown) {
    console.error("Formateur creation error:", err);
    const msg = err instanceof Error && err.message.includes("Unique constraint")
      ? "Un formateur avec cet email existe déjà"
      : "Erreur lors de la création du formateur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
