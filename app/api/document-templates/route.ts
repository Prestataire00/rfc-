export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TEMPLATE_DEFAULTS } from "@/lib/document-templates";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/document-templates
// Auto-seed si aucun template en base.
export const GET = withErrorHandler(async () => {
  const count = await prisma.documentTemplate.count();
  if (count === 0) {
    await Promise.all(
      DOCUMENT_TEMPLATE_DEFAULTS.map((d) =>
        prisma.documentTemplate.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            type: d.type,
            nom: d.nom,
            description: d.description,
            titre: d.titre,
            introduction: d.introduction,
            corps: d.corps,
            mentions: d.mentions,
            variables: JSON.stringify(d.variables),
          },
          update: {},
        })
      )
    );
  }
  const templates = await prisma.documentTemplate.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(templates);
});
