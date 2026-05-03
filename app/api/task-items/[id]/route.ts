export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  titre: z.string().min(1),
  description: z.string().optional().nullable(),
  completed: z.boolean(),
  dueDate: z.string().optional().nullable(),
  priorite: z.string().optional().nullable(),
  ordre: z.number().int(),
  userId: z.string().optional().nullable(),
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const data: Record<string, unknown> = { ...body };

  if (typeof body.dueDate === "string") {
    data.dueDate = new Date(body.dueDate);
  }

  if (typeof body.completed === "boolean") {
    const current = await prisma.taskItem.findUnique({ where: { id: params.id } });
    if (current && current.completed !== body.completed) {
      data.completedAt = body.completed ? new Date() : null;
    }
  }

  const item = await prisma.taskItem.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.taskItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
