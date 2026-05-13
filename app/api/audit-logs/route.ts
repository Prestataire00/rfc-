export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

/**
 * GET /api/audit-logs
 *
 * Lecture seule, admin-only (gating fait par le middleware via
 * adminApiPrefixes). Pagination cursor-based pour gérer une table qui
 * peut grossir vite.
 *
 * Query params :
 *   ?action=devis.sign           filtre exact sur l'action
 *   ?resourceType=User           filtre exact
 *   ?resourceId=clx...           filtre exact
 *   ?actorEmail=alice@x.com      filtre partiel (contains, case-insensitive)
 *   ?from=2026-05-01             ISO date (createdAt >=)
 *   ?to=2026-05-13               ISO date (createdAt <=)
 *   ?cursor=clx...               id du dernier log de la page précédente
 *   ?take=50                     taille de page (defaults 50, max 200)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const params = url.searchParams;

  const take = Math.min(Number(params.get("take")) || 50, 200);
  const cursor = params.get("cursor");

  const where: Record<string, unknown> = {};

  const action = params.get("action");
  if (action) where.action = action;

  const resourceType = params.get("resourceType");
  if (resourceType) where.resourceType = resourceType;

  const resourceId = params.get("resourceId");
  if (resourceId) where.resourceId = resourceId;

  const actorEmail = params.get("actorEmail");
  if (actorEmail) {
    where.actorEmail = { contains: actorEmail, mode: "insensitive" };
  }

  const from = params.get("from");
  const to = params.get("to");
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.createdAt = range;
  }

  const logs = await prisma.auditLog.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > take;
  const items = hasMore ? logs.slice(0, take) : logs;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
});
