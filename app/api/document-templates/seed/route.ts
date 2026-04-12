export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TEMPLATE_DEFAULTS } from "@/lib/document-templates";

// POST /api/document-templates/seed
// Cree les defauts manquants. Preserve les templates modifies par l'admin.
// Query ?force=true pour ecraser les templates modifies.
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const results = await Promise.all(
      DOCUMENT_TEMPLATE_DEFAULTS.map(async (d) => {
        const existing = await prisma.documentTemplate.findUnique({ where: { id: d.id } });
        if (existing && existing.modifie && !force) {
          return { id: d.id, status: "preserved_user_edit" };
        }
        await prisma.documentTemplate.upsert({
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
          update: {
            nom: d.nom,
            description: d.description,
            titre: d.titre,
            introduction: d.introduction,
            corps: d.corps,
            mentions: d.mentions,
            variables: JSON.stringify(d.variables),
            modifie: false,
          },
        });
        return { id: d.id, status: force ? "reset" : "seeded" };
      })
    );
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Seed document templates:", err);
    return NextResponse.json({ error: "Erreur seed" }, { status: 500 });
  }
}
