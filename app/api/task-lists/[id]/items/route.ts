export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  titre: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priorite: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, createSchema);

  const max = await prisma.taskItem.aggregate({
    where: { listId: params.id },
    _max: { ordre: true },
  });
  const ordre = (max._max.ordre ?? -1) + 1;

  const item = await prisma.taskItem.create({
    data: {
      listId: params.id,
      titre: body.titre,
      description: body.description ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      priorite: body.priorite ?? null,
      userId: body.userId ?? null,
      ordre,
    },
  });

  return NextResponse.json(item, { status: 201 });
});
