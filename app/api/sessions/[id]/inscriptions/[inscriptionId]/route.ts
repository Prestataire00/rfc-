export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const inscriptionPatchSchema = z.object({
  statut: z.string().optional(),
  notes: z.string().optional().nullable(),
  // documentsRemis : JSON-stringified array (preferred) ou tableau (sera serialise)
  documentsRemis: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .nullable(),
});

export const PATCH = withErrorHandlerParams(async (
  req: NextRequest,
  { params }: { params: { id: string; inscriptionId: string } }
) => {
  const parsed = await parsePartialBody(req, inscriptionPatchSchema);

  const data: Record<string, unknown> = {};
  if (parsed.statut !== undefined) data.statut = parsed.statut;
  if (parsed.notes !== undefined) data.notes = parsed.notes;
  if (parsed.documentsRemis !== undefined && parsed.documentsRemis !== null) {
    data.documentsRemis = Array.isArray(parsed.documentsRemis)
      ? JSON.stringify(parsed.documentsRemis)
      : parsed.documentsRemis;
  }

  const inscription = await prisma.inscription.update({
    where: { id: params.inscriptionId },
    data,
  });
  return NextResponse.json(inscription);
});

export const DELETE = withErrorHandlerParams(async (
  _: NextRequest,
  { params }: { params: { id: string; inscriptionId: string } }
) => {
  await prisma.inscription.delete({ where: { id: params.inscriptionId } });
  return NextResponse.json({ success: true });
});
