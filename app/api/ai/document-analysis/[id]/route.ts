export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiGuard } from "@/lib/ai-guard";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// PUT /api/ai/document-analysis/[id] — validation manuelle admin
// Body: { statut: "valide_manuel" | "rejete", commentaireAdmin? }
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const validStatuts = ["valide_manuel", "rejete", "a_verifier", "valide_auto"];
  if (body.statut && !validStatuts.includes(body.statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const analysis = await prisma.aiDocumentAnalysis.update({
    where: { id: params.id },
    data: {
      statut: body.statut ?? undefined,
      commentaireAdmin: body.commentaireAdmin ?? undefined,
    },
  });

  return NextResponse.json(analysis);
});
