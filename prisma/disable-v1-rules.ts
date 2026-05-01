// Script de migration manuelle : désactive toutes les règles V1 (table AutomationRule).
// Le moteur V1 est déprécié (chantier 2) — les règles restent en base pour historique
// mais elles ne doivent plus être exécutées (le cron est de toute façon retiré dans netlify.toml).
// Usage : npx tsx prisma/disable-v1-rules.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.automationRule.updateMany({
    where: { enabled: true },
    data: { enabled: false },
  });
  console.log(`[v1-deprecation] ${result.count} règle(s) V1 désactivée(s).`);
}

main()
  .catch((e) => {
    console.error("[v1-deprecation] échec :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
