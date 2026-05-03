export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  type: z.string().min(1),
  titre: z.string().min(1),
  description: z.string().optional().nullable(),
  date: z.string().optional(),
  userId: z.string().optional().nullable(),
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.prospectActivity.create({
    data: {
      prospectId: params.id,
      type: body.type,
      titre: body.titre,
      description: body.description ?? null,
      date: body.date ? new Date(body.date) : new Date(),
      userId: body.userId ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
