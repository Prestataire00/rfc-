export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MESSAGE_TEMPLATE_DEFAULTS } from "@/lib/message-templates";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/message-templates
// Auto-seed si aucun template en base.
export const GET = withErrorHandler(async () => {
  const count = await prisma.messageTemplate.count();
  if (count === 0) {
    await Promise.all(
      MESSAGE_TEMPLATE_DEFAULTS.map((d) =>
        prisma.messageTemplate.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            type: d.type,
            nom: d.nom,
            description: d.description,
            objet: d.objet,
            contenu: d.contenu,
            variables: JSON.stringify(d.variables),
          },
          update: {},
        })
      )
    );
  }
  const templates = await prisma.messageTemplate.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(templates);
});
