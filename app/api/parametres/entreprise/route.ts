export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

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
  return NextResponse.json(params);
});
