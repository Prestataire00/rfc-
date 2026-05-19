export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { aiGuard } from "@/lib/ai-guard";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const aiDocAnalysisPutSchema = z.object({
  statut: z.enum(["valide_manuel", "rejete", "a_verifier", "valide_auto"]).optional(),
  commentaireAdmin: z.string().max(2000).optional().nullable(),
});

// PUT /api/ai/document-analysis/[id] — validation manuelle admin
// Body: { statut: "valide_manuel" | "rejete", commentaireAdmin? }
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;

  const raw = await req.json().catch(() => null);
  const parsed = aiDocAnalysisPutSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const analysis = await prisma.aiDocumentAnalysis.update({
    where: { id: params.id },
    data: {
      statut: parsed.data.statut ?? undefined,
      commentaireAdmin: parsed.data.commentaireAdmin ?? undefined,
    },
  });

  return NextResponse.json(analysis);
});
