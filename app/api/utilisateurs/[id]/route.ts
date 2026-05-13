export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { diffFields, logAuditFromRequest } from "@/lib/audit";

type SessionUserShape = { id?: string; email?: string | null; role?: string };

async function actorFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as SessionUserShape;
  return {
    id: u.id ?? "",
    email: u.email ?? "",
    role: u.role ?? "",
  };
}

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
  const body = await req.json();
  const { email, password, nom, prenom, role, actif, formateurId, entrepriseId } = body;

  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      email: true, nom: true, prenom: true, role: true,
      actif: true, formateurId: true, entrepriseId: true,
    },
  });

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

  if (before) {
    const after = {
      email: user.email, nom: user.nom, prenom: user.prenom, role: user.role,
      actif: user.actif, formateurId: user.formateurId, entrepriseId: user.entrepriseId,
    };
    const diff = diffFields(before, after, [
      "email", "nom", "prenom", "role", "actif", "formateurId", "entrepriseId",
    ]);
    if (diff) {
      const isRoleChange = before.role !== after.role;
      const isDeactivation = before.actif && !after.actif;
      await logAuditFromRequest(req, {
        action: isRoleChange
          ? "user.role_change"
          : isDeactivation
            ? "user.deactivate"
            : "user.update",
        actor: await actorFromSession(),
        resource: { type: "User", id: user.id },
        metadata: { ...diff, passwordChanged: Boolean(password) },
      });
    } else if (password) {
      // Aucun champ ne change sauf le password — audit dédié.
      await logAuditFromRequest(req, {
        action: "auth.password_reset_complete",
        actor: await actorFromSession(),
        resource: { type: "User", id: user.id },
      });
    }
  }

  return NextResponse.json(user);
});

export const DELETE = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: { email: true, role: true },
  });

  await prisma.user.delete({ where: { id: params.id } });

  await logAuditFromRequest(req, {
    action: "user.delete",
    actor: await actorFromSession(),
    resource: { type: "User", id: params.id },
    metadata: before ? { email: before.email, role: before.role } : null,
  });

  return NextResponse.json({ success: true });
});
