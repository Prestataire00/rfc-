export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MESSAGE_TEMPLATE_DEFAULTS } from "@/lib/message-templates";

// POST /api/message-templates/seed
// Upsert des defauts : cree ce qui manque, laisse les modifications utilisateur.
// Query ?force=true pour ecraser les templates modifies.
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const results = await Promise.all(
      MESSAGE_TEMPLATE_DEFAULTS.map(async (d) => {
        const existing = await prisma.messageTemplate.findUnique({ where: { id: d.id } });
        if (existing && existing.modifie && !force) {
          return { id: d.id, status: "preserved_user_edit" };
        }
        await prisma.messageTemplate.upsert({
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
        return { id: d.id, status: force ? "reset" : "seeded" };
      })
    );
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Seed message templates:", err);
    return NextResponse.json({ error: "Erreur seed" }, { status: 500 });
  }
}
