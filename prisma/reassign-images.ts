/* eslint-disable @typescript-eslint/no-explicit-any */
// Script one-shot : reattribue une image distincte a chaque formation existante
// en utilisant pickImageForFormation. Idempotent (rerun donne le meme resultat).
// Usage : DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/reassign-images.ts
import { PrismaClient } from "@prisma/client";
import { pickImageForFormation } from "../lib/formation-images";

const prisma = new PrismaClient();

(async () => {
  try {
    const formations = await prisma.formation.findMany({
      select: { id: true, titre: true, categorie: true, image: true },
    });
    let changed = 0;
    let unchanged = 0;
    for (const f of formations) {
      const newImage = pickImageForFormation(f.titre, f.categorie);
      if (newImage === f.image) {
        unchanged++;
        continue;
      }
      await prisma.formation.update({
        where: { id: f.id },
        data: { image: newImage },
      });
      changed++;
    }
    console.log(`Reassigned: ${changed} formation(s). Unchanged: ${unchanged}.`);
  } catch (e: any) {
    console.error("Failed:", e.message);
    process.exit(1);
  }
  await prisma.$disconnect();
})();
