export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const convertirSchema = z.object({
  type: z.string().optional(),
  entrepriseId: z.string().optional().nullable(),
  poste: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, convertirSchema);

  const prospect = await prisma.prospect.findUnique({ where: { id: params.id } });
  if (!prospect) return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  if (prospect.contactId) {
    return NextResponse.json({ error: "Prospect deja converti" }, { status: 409 });
  }
  if (!prospect.email) {
    return NextResponse.json({ error: "Email requis pour conversion" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        nom: prospect.nom,
        prenom: prospect.prenom,
        email: prospect.email!,
        telephone: prospect.telephone,
        type: body.type || "client",
        entrepriseId: body.entrepriseId || null,
        poste: body.poste || null,
        notes: body.notes || prospect.notes || null,
      },
    });

    const updated = await tx.prospect.update({
      where: { id: params.id },
      data: {
        contactId: contact.id,
        statut: "gagne",
        dateConversion: new Date(),
      },
      include: { contact: true },
    });

    return { contact, prospect: updated };
  });

  return NextResponse.json(result, { status: 201 });
});
