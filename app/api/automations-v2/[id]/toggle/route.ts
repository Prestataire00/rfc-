export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const PATCH = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const rule = await prisma.automationRuleV2.findUnique({ where: { id: params.id } });
  if (!rule) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const updated = await prisma.automationRuleV2.update({
    where: { id: params.id },
    data: { enabled: !rule.enabled },
  });
  return NextResponse.json(updated);
});
