export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateModuleSchema = z.object({
  ordre: z.number().int(),
  obligatoire: z.boolean(),
});

type Params = { id: string; moduleId: string };

export const PUT = withErrorHandlerParams<Params>(async (req: NextRequest, { params }: { params: Params }) => {
  const body = await parsePartialBody(req, updateModuleSchema);
  const item = await prisma.parcoursModule.update({
    where: { id: params.moduleId },
    data: body,
  });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams<Params>(async (_req: NextRequest, { params }: { params: Params }) => {
  await prisma.parcoursModule.delete({ where: { id: params.moduleId } });
  return NextResponse.json({ ok: true });
});
