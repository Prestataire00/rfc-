export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";
import { encryptNSS, decryptNSS } from "@/lib/encryption";

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
      demandes: {
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
  return NextResponse.json({
    ...contact,
    numeroSecuriteSociale: decryptNSS(contact.numeroSecuriteSociale),
  });
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const parsed = await parsePartialBody(req, contactSchema);

  const data: Record<string, unknown> = { ...parsed };
  if (typeof data.dateNaissance === "string" && data.dateNaissance) {
    const d = new Date(data.dateNaissance);
    data.dateNaissance = isNaN(d.getTime()) ? null : d;
  }
  if (typeof data.numeroSecuriteSociale === "string") {
    // Normaliser : strip whitespace puis traiter "" comme null
    const cleaned = data.numeroSecuriteSociale.replace(/\s/g, "");
    data.numeroSecuriteSociale = cleaned === "" ? null : encryptNSS(cleaned);
  }

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data,
  });
  // Cohérence avec GET : décrypter le NSS dans la réponse (sinon le client
  // qui consume PUT recevrait du ciphertext alors que GET retourne du clair).
  return NextResponse.json({
    ...contact,
    numeroSecuriteSociale: decryptNSS(contact.numeroSecuriteSociale),
  });
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
