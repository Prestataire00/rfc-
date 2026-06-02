export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { invalidateBrandingCache } from "@/lib/pdf/branding";

export const GET = withErrorHandler(async () => {
  let params = await prisma.parametres.findUnique({ where: { id: "default" } });
  if (!params) {
    params = await prisma.parametres.create({ data: { id: "default" } });
  }
  return NextResponse.json(params);
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const params = await prisma.parametres.upsert({
    where: { id: "default" },
    create: { id: "default", ...body },
    update: body,
  });
  // Invalide le cache branding (logo+tampon) pour que les PDFs générés
  // après cette sauvegarde voient immédiatement la nouvelle image, sans
  // attendre le TTL de 1h.
  invalidateBrandingCache();
  return NextResponse.json(params);
});
