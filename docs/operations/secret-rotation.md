# Rotation des secrets — RFC Formations

Procédure de rotation des secrets critiques. À appliquer **immédiatement** en cas de compromission suspectée, **planifiée** sinon (audit trimestriel).

---

## NEXTAUTH_SECRET (sessions JWT)

**Quand** :
- Suspicion de compromission de la clé (fuite repo, accès admin non autorisé à Netlify, etc.)
- Doute sur l'intégrité d'une session admin
- Rotation préventive tous les 6 mois

**Impact** : **tous les utilisateurs sont déconnectés** (les JWT existants ne sont plus vérifiables avec la nouvelle clé). À privilégier hors heures ouvrées si possible.

**Procédure** :

1. **Générer** la nouvelle valeur :
   ```bash
   openssl rand -base64 32
   ```

2. **Mettre à jour Netlify** :
   - Netlify UI → Site settings → Build & deploy → Environment variables
   - Modifier `NEXTAUTH_SECRET` avec la nouvelle valeur
   - **Trigger deploy** (le nouveau process picke la nouvelle env)

3. **Mettre à jour GitHub Secrets** si `NEXTAUTH_SECRET` est utilisé en CI (pour Vitest, normalement non requis car les tests Vitest ne signent pas de tokens NextAuth).

4. **Vérifier** :
   - Se connecter avec un compte admin → OK
   - Les utilisateurs déjà connectés sont redirigés vers `/login` (session invalide)

5. **Communiquer** : message aux utilisateurs (admin, formateurs, clients) → "vous devez vous reconnecter".

---

## NSS_ENCRYPTION_KEY (chiffrement NSS Contact)

**Quand** :
- Suspicion de fuite de la clé (le risque principal)
- Rotation préventive annuelle

**Impact** : **les NSS chiffrés avec l'ancienne clé deviennent illisibles** si la rotation n'est pas accompagnée d'une re-encryption. La rotation est donc **plus délicate** que celle de `NEXTAUTH_SECRET`.

**Procédure (v1 — manuelle, sans support multi-clé)** :

1. **Sauvegarder l'ancienne clé** (ne pas la perdre — nécessaire pour le déchiffrement initial).

2. **Décrypter en masse** avec l'ancienne clé :
   - Snapshot Supabase
   - Script ad hoc : pour chaque Contact avec NSS chiffré, déchiffrer en mémoire, stocker temporairement en clair (dans une table de migration ou un dump local sécurisé)

3. **Générer la nouvelle clé** :
   ```bash
   openssl rand -base64 32
   ```

4. **Mettre à jour Netlify** :
   - Variable `NSS_ENCRYPTION_KEY` → nouvelle valeur
   - Trigger deploy

5. **Ré-encrypter** : lancer `prisma/migrate-nss-encryption.ts` avec la nouvelle clé sur les valeurs en clair restaurées en step 2.

6. **Vérifier** :
   - Ouvrir une fiche contact admin → NSS affiché correctement
   - Lancer le PDF fiche-inscription d'un contact → NSS présent

7. **Détruire** l'ancienne clé après validation (ne pas conserver — réduit la surface d'attaque).

**Évolution future** : implémenter le support multi-clés dans `lib/encryption.ts` (préfixe `enc::v2::`, déchiffrement essayant v2 puis v1 en fallback) → rotation sans downtime. Hors scope v1.

---

## CRON_SECRET (auth crons GitHub Actions → Netlify)

**Quand** : compromission suspectée (rare — la clé n'est exposée que dans GitHub Secrets et l'env Netlify).

**Impact** : les crons en cours échouent jusqu'à la mise à jour des deux côtés. Pas d'impact utilisateur direct.

**Procédure** :

1. **Générer** :
   ```bash
   openssl rand -base64 32
   ```

2. **Mettre à jour GitHub Secrets** :
   - GitHub Repo → Settings → Secrets and variables → Actions
   - Modifier `CRON_SECRET` avec la nouvelle valeur

3. **Mettre à jour Netlify** :
   - Variable `CRON_SECRET` → nouvelle valeur
   - Trigger deploy

4. **Vérifier** : déclencher manuellement un cron via `workflow_dispatch` → doit retourner HTTP 200.

---

## SECRET_HMAC_TOKENS (signature électronique)

**Quand** :
- Suspicion de compromission
- Rotation préventive annuelle

**Impact** : les liens magiques de signature en cours (`/sign/<token>`) deviennent invalides → les signataires reçoivent une page d'erreur. Si une signature est en cours, elle ne peut pas être finalisée.

**Procédure (avec rotation gracieuse via `SECRET_HMAC_TOKENS_OLD`)** :

1. **Renommer** l'ancienne valeur :
   - Netlify : copier la valeur de `SECRET_HMAC_TOKENS` dans une nouvelle var `SECRET_HMAC_TOKENS_OLD` (le code accepte les deux pendant la rotation)

2. **Générer** la nouvelle :
   ```bash
   openssl rand -base64 32
   ```

3. **Mettre à jour Netlify** :
   - `SECRET_HMAC_TOKENS` → nouvelle valeur
   - Trigger deploy

4. **Attendre** la fin du TTL des tokens existants (`SIGNATURE_TOKEN_EXPIRY_DAYS = 30` par défaut → attendre 30 jours).

5. **Supprimer** `SECRET_HMAC_TOKENS_OLD` :
   - Netlify : delete la variable
   - Trigger deploy

---

## SMTP_PASS / API keys externes (Anthropic, Upstash, Sentry)

**Quand** : à la discrétion du fournisseur ou en cas de compromission.

**Procédure générique** :

1. Générer / régénérer la clé chez le fournisseur (Sentry, Upstash, Anthropic console, fournisseur SMTP).
2. Mettre à jour Netlify env var correspondante.
3. Trigger deploy.
4. Vérifier (envoi d'email test, requête IA admin, hit endpoint rate-limité).

---

## Checklist annuelle de rotation préventive

À faire **chaque année** en heures creuses :

- [ ] `NEXTAUTH_SECRET` (impact : déconnexion globale)
- [ ] `NSS_ENCRYPTION_KEY` (impact : procédure de re-encryption à exécuter)
- [ ] `CRON_SECRET`
- [ ] `SECRET_HMAC_TOKENS` (rotation gracieuse via `_OLD`, étalée sur 30 jours)
- [ ] API keys externes (Anthropic, Upstash, Sentry, SMTP)

---

## Quoi faire en cas de compromission suspectée

**Sévérité haute** (clé fuitée publiquement, accès admin non autorisé) :

1. **Immédiatement** : rotation `NEXTAUTH_SECRET` → invalide toutes les sessions admin (et utilisateurs).
2. Auditer les `HistoriqueAction` récents pour identifier les actions suspectes.
3. Rotation des autres secrets selon ce qui a pu être exposé.
4. Communiquer aux utilisateurs (déconnexion forcée + reconnection).
5. Post-mortem documenté dans `docs/operations/incident-*.md`.
