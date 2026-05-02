export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TEMPLATE_DEFAULTS } from "@/lib/document-templates";
import { withErrorHandler } from "@/lib/api-wrapper";

// POST /api/document-templates/seed
// Cree les defauts manquants. Preserve les templates modifies par l'admin.
// Query ?force=true pour ecraser les templates modifies.
// Atomique : si un upsert echoue, aucun n'est applique (etat coherent du catalogue).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";

  const results = await prisma.$transaction(async (tx) => {
    const out: { id: string; status: string }[] = [];
    for (const d of DOCUMENT_TEMPLATE_DEFAULTS) {
      const existing = await tx.documentTemplate.findUnique({ where: { id: d.id } });
      if (existing && existing.modifie && !force) {
        out.push({ id: d.id, status: "preserved_user_edit" });
        continue;
      }
      await tx.documentTemplate.upsert({
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
      out.push({ id: d.id, status: force ? "reset" : "seeded" });
    }
    return out;
  });
  return NextResponse.json({ results });
});
