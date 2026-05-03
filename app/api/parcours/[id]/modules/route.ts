export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const addModuleSchema = z.object({
  formationId: z.string().min(1),
  ordre: z.number().int().optional(),
  obligatoire: z.boolean().optional(),
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, addModuleSchema);

  let ordre = body.ordre;
  if (ordre === undefined) {
    const max = await prisma.parcoursModule.aggregate({
      where: { parcoursId: params.id },
      _max: { ordre: true },
    });
    ordre = (max._max.ordre ?? -1) + 1;
  }

  const module = await prisma.parcoursModule.create({
    data: {
      parcoursId: params.id,
      formationId: body.formationId,
      ordre,
      obligatoire: body.obligatoire ?? true,
    },
    include: { formation: true },
  });

  return NextResponse.json(module, { status: 201 });
});
