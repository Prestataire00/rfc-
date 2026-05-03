export const dynamic = "force-dynamic";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  expireAt: z.string().optional().nullable(),
  actif: z.boolean().optional(),
});

export const GET = withErrorHandler(async () => {
  const items = await prisma.partageQualiopi.findMany({
    where: { actif: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  const body = await parseBody(req, createSchema);

  const item = await prisma.partageQualiopi.create({
    data: {
      token: randomBytes(24).toString("hex"),
      nom: body.nom,
      expireAt: body.expireAt ? new Date(body.expireAt) : null,
      actif: body.actif ?? true,
      createdByUserId: session?.user?.id ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
