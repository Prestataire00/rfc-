export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MESSAGE_TEMPLATE_DEFAULTS } from "@/lib/message-templates";
import { withErrorHandler } from "@/lib/api-wrapper";

// POST /api/message-templates/seed
// Upsert des defauts : cree ce qui manque, laisse les modifications utilisateur.
// Query ?force=true pour ecraser les templates modifies.
// Atomique : si un upsert echoue, aucun n'est applique.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";

  const results = await prisma.$transaction(async (tx) => {
    const out: { id: string; status: string }[] = [];
    for (const d of MESSAGE_TEMPLATE_DEFAULTS) {
      const existing = await tx.messageTemplate.findUnique({ where: { id: d.id } });
      if (existing && existing.modifie && !force) {
        out.push({ id: d.id, status: "preserved_user_edit" });
        continue;
      }
      await tx.messageTemplate.upsert({
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
        update: {
          nom: d.nom,
          description: d.description,
          objet: d.objet,
          contenu: d.contenu,
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
