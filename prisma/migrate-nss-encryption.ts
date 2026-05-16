// Migration ponctuelle : chiffre les numeroSecuriteSociale existants en base.
// Idempotent — passe les valeurs déjà chiffrées (préfixe enc::v1::).
//
// Usage :
//   1. Définir NSS_ENCRYPTION_KEY en env (32 bytes base64)
//      → openssl rand -base64 32
//   2. Faire un snapshot Supabase JUSTE AVANT (sécurité ceinture+bretelles)
//   3. ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-nss-encryption.ts
//   4. Re-run pour vérifier l'idempotence : doit logger "0 ligne(s) à chiffrer"
//
// Rollback : restore du snapshot Supabase si problème (le ciphertext est
// non-réversible sans la clé, donc perdre la clé après migration = perte des
// données NSS).

import { PrismaClient } from "@prisma/client";
import { encryptNSS, isEncryptedNSS } from "../lib/encryption";

async function main() {
  const prisma = new PrismaClient();

  if (!process.env.NSS_ENCRYPTION_KEY) {
    console.error("✗ NSS_ENCRYPTION_KEY non défini — abort");
    process.exit(1);
  }

  const total = await prisma.contact.count({
    where: { numeroSecuriteSociale: { not: null } },
  });
  console.log(`→ ${total} contact(s) avec un numeroSecuriteSociale non-null`);

  const contacts = await prisma.contact.findMany({
    where: { numeroSecuriteSociale: { not: null } },
    select: { id: true, numeroSecuriteSociale: true },
  });

  const toEncrypt = contacts.filter((c) => !isEncryptedNSS(c.numeroSecuriteSociale));
  console.log(`→ ${toEncrypt.length} ligne(s) à chiffrer (${contacts.length - toEncrypt.length} déjà chiffrée(s))`);

  if (toEncrypt.length === 0) {
    console.log("✓ Rien à faire — migration idempotente OK");
    await prisma.$disconnect();
    return;
  }

  let success = 0;
  let failures = 0;

  for (const c of toEncrypt) {
    try {
      const ciphertext = encryptNSS(c.numeroSecuriteSociale);
      await prisma.contact.update({
        where: { id: c.id },
        data: { numeroSecuriteSociale: ciphertext },
      });
      success++;
    } catch (err) {
      failures++;
      console.error(`✗ Contact ${c.id} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`✓ Migration terminée : ${success} succès, ${failures} échec(s)`);
  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("✗ Erreur fatale :", err);
  process.exit(1);
});
