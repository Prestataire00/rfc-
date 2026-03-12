import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      actif: true,
      createdAt: true,
      formateurId: true,
      entrepriseId: true,
      formateur: { select: { id: true, nom: true, prenom: true } },
      entreprise: { select: { id: true, nom: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { email, password, nom, prenom, role, actif, formateurId, entrepriseId } = body;

  const data: Record<string, unknown> = {};
  if (email !== undefined) data.email = email;
  if (nom !== undefined) data.nom = nom;
  if (prenom !== undefined) data.prenom = prenom;
  if (role !== undefined) data.role = role;
  if (actif !== undefined) data.actif = actif;
  if (formateurId !== undefined) data.formateurId = formateurId || null;
  if (entrepriseId !== undefined) data.entrepriseId = entrepriseId || null;

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
