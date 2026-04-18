export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/automations-v2/executions?ruleId=&status=&limit=50&offset=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get("ruleId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (ruleId) where.ruleId = ruleId;
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.automationExecutionV2.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { rule: { select: { nom: true, actionType: true } } },
      }),
      prisma.automationExecutionV2.count({ where }),
    ]);

    return NextResponse.json({ executions, total, limit, offset });
  } catch (err) {
    console.error("GET executions:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
