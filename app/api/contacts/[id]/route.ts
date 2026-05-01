export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      entreprise: true,
      inscriptions: {
        include: {
          session: { include: { formation: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      devis: { orderBy: { createdAt: "desc" } },
      attestations: { orderBy: { createdAt: "desc" } },
      evaluations: { orderBy: { createdAt: "desc" } },
      besoins: {
        include: { formation: true },
        orderBy: { createdAt: "desc" },
      },
      feuillesPresence: {
        include: { session: { include: { formation: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contact) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(contact);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const parsed = await parsePartialBody(req, contactSchema);

  const data: Record<string, unknown> = { ...parsed };
  if (typeof data.dateNaissance === "string" && data.dateNaissance) {
    const d = new Date(data.dateNaissance);
    data.dateNaissance = isNaN(d.getTime()) ? null : d;
  }
  if (typeof data.numeroSecuriteSociale === "string" && data.numeroSecuriteSociale) {
    data.numeroSecuriteSociale = data.numeroSecuriteSociale.replace(/\s/g, "");
  }

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(contact);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
