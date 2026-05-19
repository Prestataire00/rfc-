export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const GET = withErrorHandler(async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
  return NextResponse.json(users);
});

// Audit 2026-05-19 §2.4 :
// - Whitelist role enum (jamais arbitraire)
// - Politique mot de passe ≥ 12 caractères + minuscule + majuscule + chiffre
//   + caractère spécial (inspirée ANSSI niveau "fort")
// - Journalisation historique
const passwordPolicy = z
  .string()
  .min(12, "Mot de passe : 12 caractères minimum")
  .regex(/[a-z]/, "Mot de passe : au moins une minuscule")
  .regex(/[A-Z]/, "Mot de passe : au moins une majuscule")
  .regex(/\d/, "Mot de passe : au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Mot de passe : au moins un caractère spécial");

const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: passwordPolicy,
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  role: z.enum(["admin", "formateur", "client"]),
  formateurId: z.string().cuid().optional().nullable(),
  entrepriseId: z.string().cuid().optional().nullable(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { email, password, nom, prenom, role, formateurId, entrepriseId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est deja utilise" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nom,
      prenom,
      role,
      formateurId: role === "formateur" ? formateurId || null : null,
      entrepriseId: role === "client" ? entrepriseId || null : null,
    },
    select: {
      id: true, email: true, nom: true, prenom: true, role: true,
      actif: true, createdAt: true, formateurId: true, entrepriseId: true,
    },
  });

  try {
    await logAction({
      action: "utilisateur_cree",
      label: `Utilisateur créé : ${prenom} ${nom} (${email}) — role: ${role}`,
      lien: `/utilisateurs/${user.id}`,
    });
  } catch (e) {
    logger.warn("historique.utilisateur_cree_failed", { error: String(e) });
  }

  return NextResponse.json(user, { status: 201 });
});
