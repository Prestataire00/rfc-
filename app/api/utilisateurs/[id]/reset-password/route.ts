export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

// Audit 2026-05-19 §2.4 : même politique mdp que la création utilisateur.
// ≥ 12 caractères + minuscule + majuscule + chiffre + caractère spécial.
const passwordPolicy = z
  .string()
  .min(12, "Mot de passe : 12 caractères minimum")
  .regex(/[a-z]/, "Mot de passe : au moins une minuscule")
  .regex(/[A-Z]/, "Mot de passe : au moins une majuscule")
  .regex(/\d/, "Mot de passe : au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Mot de passe : au moins un caractère spécial");

const resetSchema = z.object({ password: passwordPolicy });

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json().catch(() => null);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { password: hashedPassword },
    select: { id: true, email: true },
  });

  try {
    await logAction({
      action: "utilisateur_mdp_reset",
      label: `Mot de passe réinitialisé pour ${user.email}`,
      lien: `/utilisateurs/${user.id}`,
    });
  } catch (e) {
    logger.warn("historique.mdp_reset_failed", { error: String(e) });
  }

  return NextResponse.json({ success: true });
});
