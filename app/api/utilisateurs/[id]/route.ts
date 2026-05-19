export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const utilisateurUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z
    .string()
    .min(12, "Mot de passe : 12 caractères minimum")
    .regex(/[a-z]/, "Mot de passe : au moins une minuscule")
    .regex(/[A-Z]/, "Mot de passe : au moins une majuscule")
    .regex(/\d/, "Mot de passe : au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Mot de passe : au moins un caractère spécial")
    .optional(),
  nom: z.string().min(1).max(120).optional(),
  prenom: z.string().min(1).max(120).optional(),
  role: z.enum(["admin", "formateur", "client"]).optional(),
  actif: z.boolean().optional(),
  formateurId: z.string().optional().nullable(),
  entrepriseId: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
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
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = utilisateurUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { email, password, nom, prenom, role, actif, formateurId, entrepriseId } = parsed.data;

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
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
