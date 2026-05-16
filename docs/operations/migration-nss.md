# Migration : chiffrement du NSS Contact

**Quand** : **une seule fois** après la mise en production de [STORY-TD-001](../prd-rfc-formations-2026-05-16.md#fr-001--gestion-des-entreprises-et-contacts) (commit 6dce3c9).
**Qui** : prestataire dev avec accès Supabase + variable `NSS_ENCRYPTION_KEY` configurée.
**Impact** : chiffrement des NSS existants. Données restent lisibles après migration (déchiffrement transparent). Aucune indisponibilité.
**Durée** : ~5 min pour quelques centaines de contacts. Linéaire avec le volume.

---

## Prérequis

1. ✅ Code TD-001 déployé en prod (lib/encryption.ts + wire-up call sites)
2. ✅ `NSS_ENCRYPTION_KEY` configurée dans Netlify env vars **et** localement
3. ✅ **Snapshot Supabase juste avant** (sécurité ceinture+bretelles)
4. ✅ Communication interne : "migration NSS en cours, ne pas créer/modifier de contacts pendant ~5 min"

---

## Génération de la clé

```bash
openssl rand -base64 32
```

Stocker la sortie **dans un coffre-fort** (1Password, Bitwarden, gestionnaire de secrets) — sa perte = perte des NSS chiffrés sans recours.

Ajouter la valeur dans **deux endroits** :
- Netlify : Site settings → Build & deploy → Environment variables → `NSS_ENCRYPTION_KEY`
- Local : `.env` (pour pouvoir exécuter le script depuis local)

---

## Snapshot Supabase

1. Supabase Dashboard → Project → Database → **Backups**
2. Trigger **Create new backup** (manuel) ou noter le snapshot automatique le plus récent
3. Vérifier que le backup est marqué "completed" avant de continuer

⚠️ **Ne pas continuer sans snapshot valide.**

---

## Exécution

Depuis la racine du dépôt :

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-nss-encryption.ts
```

**Sortie attendue (première exécution)** :
```text
→ 42 contact(s) avec un numeroSecuriteSociale non-null
→ 42 ligne(s) à chiffrer (0 déjà chiffrée(s))
✓ Migration terminée : 42 succès, 0 échec(s)
```

**Sortie attendue (re-run d'idempotence)** :
```text
→ 42 contact(s) avec un numeroSecuriteSociale non-null
→ 0 ligne(s) à chiffrer (42 déjà chiffrée(s))
✓ Rien à faire — migration idempotente OK
```

---

## Vérifications post-migration

### 1. Inspection SQL directe

Via Supabase SQL editor :

```sql
SELECT id, nom, prenom,
       LEFT(numeroSecuriteSociale, 9) AS prefix,
       LENGTH(numeroSecuriteSociale) AS len
FROM "Contact"
WHERE numeroSecuriteSociale IS NOT NULL
LIMIT 10;
```

Attendu : tous les `prefix` commencent par `enc::v1::` et les `len` sont uniformément grandes (>50).

### 2. Test fonctionnel : fiche admin

- Ouvrir un contact en admin → le NSS s'affiche en clair (déchiffrement transparent côté GET API)
- Modifier le contact, sauvegarder, recharger → toujours en clair côté UI, toujours chiffré côté DB

### 3. Test fonctionnel : génération PDF fiche-inscription

- Sur un contact avec NSS, générer le PDF fiche-inscription
- Vérifier que le NSS apparaît en clair dans le PDF (pas le ciphertext)

### 4. Test fonctionnel : besoin stagiaire public

- Ouvrir `/fiche-besoin-stagiaire/[token]` d'un contact avec NSS
- Vérifier que le NSS est masqué (`••••••••••••XXX` = 3 derniers chiffres)
- Pas le ciphertext, pas le NSS en clair

### 5. Test : nouveau contact

- Créer un nouveau contact via `/contacts/nouveau` avec un NSS
- Vérifier en SQL que `numeroSecuriteSociale` est chiffré dès l'insertion

---

## Rollback (en cas de problème)

Si la migration a un comportement inattendu (erreur de chiffrement, perte de données détectée) :

1. **Restore Supabase snapshot** pris au prérequis
2. **Investigation** : pourquoi la migration a échoué ? (logs script + Sentry)
3. **Fix** dans `lib/encryption.ts` ou `prisma/migrate-nss-encryption.ts`
4. **Re-tester** sur staging ou backup
5. **Re-tenter** après validation

⚠️ Le ciphertext n'est PAS réversible sans la clé. Si vous perdez `NSS_ENCRYPTION_KEY` après migration, **les NSS sont définitivement perdus** (sauf restore du snapshot pré-migration).

---

## Post-migration

- [ ] Confirmer que tous les NSS sont chiffrés (re-run du script = idempotent, doit logger "0 à chiffrer")
- [ ] Ajouter `NSS_ENCRYPTION_KEY` à la procédure de rotation (cf. [secret-rotation.md](secret-rotation.md))
- [ ] Marquer cette migration comme effectuée dans un changelog interne (date + opérateur)
- [ ] Communiquer aux équipes : "migration NSS terminée, business as usual"
