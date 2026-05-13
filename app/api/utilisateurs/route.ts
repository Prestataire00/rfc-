export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withErrorHandler } from "@/lib/api-wrapper";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";

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

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate-limit : empêche un compte admin compromis de spawn N users en boucle
  // (privilege escalation par création d'admins parallèles).
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const limited = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.authMutation,
    "users:create",
    userId,
  );
  if (limited) return limited;

  const body = await req.json();
  const { email, password, nom, prenom, role, formateurId, entrepriseId } = body;

  if (!email || !password || !nom || !prenom || !role) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

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
  });

  return NextResponse.json(user, { status: 201 });
});
