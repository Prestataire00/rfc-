export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const entrepriseId = searchParams.get("entrepriseId");
  const contactId = searchParams.get("contactId");

  if (!entrepriseId && !contactId) {
    return NextResponse.json({ error: "entrepriseId ou contactId requis" }, { status: 400 });
  }

  const OR: object[] = [];
  if (entrepriseId) OR.push({ entrepriseId });
  if (contactId) OR.push({ contactId });

  const historique = await prisma.historiqueAction.findMany({
    where: { OR },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const seen = new Set<string>();
  const unique = historique.filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });

  return NextResponse.json(unique);
});
