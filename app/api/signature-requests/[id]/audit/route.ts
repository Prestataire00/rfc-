// Spec §"SignatureEvent". Retourne tous les events d'une request + statut intégrité chaîne.
// Sprint 6 : utilisé par /signatures/[id] côté admin pour afficher l'audit log.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { verifyAuditChain } from "@/lib/signatures/audit-chain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [events, integrity] = await Promise.all([
    prisma.signatureEvent.findMany({
      where: { requestId: ctx.params.id },
      orderBy: { createdAt: "asc" },
    }),
    verifyAuditChain(ctx.params.id),
  ]);
  return NextResponse.json({ events, integrity });
});
