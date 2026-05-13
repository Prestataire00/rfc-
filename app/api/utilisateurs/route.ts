export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logAuditFromRequest } from "@/lib/audit";

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

  const session = await getServerSession(authOptions);
  await logAuditFromRequest(req, {
    action: "user.create",
    actor: session?.user
      ? {
          id: (session.user as { id?: string }).id ?? "",
          email: session.user.email ?? "",
          role: (session.user as { role?: string }).role ?? "",
        }
      : null,
    resource: { type: "User", id: user.id },
    metadata: { email: user.email, role: user.role },
  });

  return NextResponse.json(user, { status: 201 });
});
