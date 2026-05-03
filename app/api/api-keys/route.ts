export const dynamic = "force-dynamic";
import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  permissions: z.array(z.string()).optional(),
  expireAt: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async () => {
  // On expose tout sauf hashKey
  const items = await prisma.apiKey.findMany({
    where: { revokedAt: null },
    select: {
      id: true,
      nom: true,
      prefix: true,
      permissions: true,
      lastUsedAt: true,
      expireAt: true,
      revokedAt: true,
      createdByUserId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  const body = await parseBody(req, createSchema);

  // Generation cle : "rfc_" + 32 chars random hex
  const random = randomBytes(16).toString("hex");
  const fullKey = `rfc_${random}`;
  const prefix = random.slice(0, 8);
  const hashKey = createHash("sha256").update(fullKey).digest("hex");

  const created = await prisma.apiKey.create({
    data: {
      nom: body.nom,
      hashKey,
      prefix,
      permissions: JSON.stringify(body.permissions ?? []),
      expireAt: body.expireAt ? new Date(body.expireAt) : null,
      createdByUserId: session?.user?.id ?? null,
    },
    select: {
      id: true,
      nom: true,
      prefix: true,
      permissions: true,
      expireAt: true,
      createdAt: true,
    },
  });

  // /!\ La cle complete n'est renvoyee qu'une seule fois ici
  return NextResponse.json({ ...created, key: fullKey }, { status: 201 });
});
