export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const source = searchParams.get("source");

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.gte = new Date(dateFrom);
    if (dateTo) range.lte = new Date(dateTo);
    where.dateSnapshot = range;
  }

  const items = await prisma.kpiHistory.findMany({
    where,
    orderBy: { dateSnapshot: "desc" },
  });
  return NextResponse.json(items);
});
