import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formateurSchema } from "@/lib/validations/formateur";

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = formateurSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { specialites, ...rest } = parsed.data;
  const formateur = await prisma.formateur.create({
    data: { ...rest, specialites: JSON.stringify(specialites) },
  });
  return NextResponse.json(formateur, { status: 201 });
}
