export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TEMPLATE_DEFAULTS } from "@/lib/document-templates";

// GET /api/document-templates
// Auto-seed si aucun template en base.
export async function GET() {
  try {
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
  } catch (err) {
    console.error("GET document-templates:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
