# Environnements — RFC Formations

**Quand consulter ce doc** : avant de tester un changement risqué (migration DB, modif d'authent, feature touchant les paiements), ou pour mettre à jour la config staging.
**Qui** : prestataire dev avec accès Netlify + Supabase.
**Impact** : mise en place du staging — pas de risque prod si tu suis l'ordre.

---

## Vue d'ensemble

| Env | Branche git | URL | Base de données | Cible |
|-----|-------------|-----|------|-------|
| **Prod** | `main` | https://projetrfc.netlify.app | Supabase `sqarupzaakvqolorutia` (région EU) | Utilisateurs RFC réels |
| **Staging** | `staging` | https://staging--projetrfc.netlify.app | Supabase **projet staging séparé** | Tests de release, validation migrations |
| **Dev local** | n'importe | http://localhost:3000 | Au choix (souvent staging ou prod read-only) | Développement |

**Architecture choisie** : **deploy contexts Netlify sur le même site**, pas 2 sites séparés. Plus simple, env vars scopées par contexte (Production / Branch deploys).

---

## Setup initial du staging (one-shot)

### Étape 1 — Créer le projet Supabase staging

1. https://supabase.com/dashboard → **New Project** dans la même organisation que la prod
2. Configuration :
   - **Name** : `rfc-formations-staging`
   - **Database Password** : générer un nouveau mot de passe fort (le sauvegarder dans 1Password)
   - **Region** : **même que la prod** (`aws-1-eu-north-1` = Stockholm)
   - **Plan** : Free (suffisant pour staging — limite 500 MB, 2 GB bandwidth/mois)
3. Attendre la création (~2 min)
4. **Settings → API** : noter
   - `Project URL` → sera `NEXT_PUBLIC_SUPABASE_URL` staging
   - `service_role` key → sera `SUPABASE_SERVICE_ROLE_KEY` staging
5. **Settings → Database → Connection string** : noter
   - URI **Transaction** mode → `DATABASE_URL` staging (avec `?pgbouncer=true`)
   - URI **Session** mode → `DIRECT_URL` staging

### Étape 2 — Pousser le schéma sur la DB staging

Depuis la racine du repo, **localement** :

```bash
# Avec la DATABASE_URL staging temporairement
DATABASE_URL="<staging-url>" \
DIRECT_URL="<staging-direct-url>" \
npx prisma db push
```

⚠️ **Ne pas** utiliser `npx prisma db push` sur la prod — c'est pour le bootstrap initial de staging uniquement. La prod utilise `prisma migrate deploy` (cf. STORY-TD-005).

### Étape 3 — Seeder staging avec les données de démo (optionnel)

```bash
DATABASE_URL="<staging-url>" \
DIRECT_URL="<staging-direct-url>" \
npm run db:seed
```

Cela créera les comptes de démo (`admin@formapro.fr` / `admin123`, etc.) — cf. [LANCEMENT.md](../../LANCEMENT.md).

### Étape 4 — Créer la branche `staging` dans git

Depuis la racine du repo :

```bash
git checkout -b staging main
git push -u origin staging
```

### Étape 5 — Configurer Netlify deploy contexts

1. Netlify Dashboard → site `projetrfc` → **Site settings**
2. **Build & deploy → Branches and deploy contexts** :
   - **Production branch** : `main` (déjà configuré)
   - **Branch deploys** : sélectionner **"Add the branches you want to deploy"** → ajouter `staging`
   - **Deploy Previews** : laisser activé pour les PRs
3. **Site settings → Environment variables** :
   - Pour chaque variable existante (DATABASE_URL, NEXTAUTH_SECRET, NSS_ENCRYPTION_KEY, CRON_SECRET, etc.), cliquer sur **Options → Set as a Deploy context value**
   - Pour chaque var, définir la valeur staging séparément :

| Variable | Production | Staging |
|----------|------------|---------|
| `DATABASE_URL` | URL Supabase prod | URL Supabase staging |
| `DIRECT_URL` | URL Supabase prod direct | URL Supabase staging direct |
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet prod | URL projet staging |
| `SUPABASE_SERVICE_ROLE_KEY` | key prod | key staging |
| `NEXTAUTH_SECRET` | secret prod | **nouveau secret** (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://projetrfc.netlify.app` | `https://staging--projetrfc.netlify.app` |
| `NSS_ENCRYPTION_KEY` | clé prod | **nouvelle clé** (`openssl rand -base64 32`) |
| `CRON_SECRET` | secret prod | secret prod (peu importe — pas de cron staging) |
| `SECRET_HMAC_TOKENS` | secret prod | **nouveau secret** (signature électronique) |
| `UPSTASH_REDIS_REST_URL` | URL Upstash prod | URL Upstash prod (ou laisser vide → fallback in-memory acceptable en staging) |
| `UPSTASH_REDIS_REST_TOKEN` | token prod | idem |
| `SENTRY_DSN` | DSN prod | DSN prod (Sentry filtrera par `environment` → "staging") |
| `NEXT_PUBLIC_SENTRY_DSN` | idem | idem |
| `SMTP_*` | config réelle prod | **désactiver ou pointer vers un MailHog / Mailtrap** (sinon staging va envoyer de vrais emails aux vrais utilisateurs) |
| `ANTHROPIC_API_KEY` | clé prod | clé prod (ou nouvelle si tu veux séparer les quotas) |

4. Cliquer **Save** après chaque variable

### Étape 6 — Déclencher le premier déploiement staging

Soit en pushant un commit sur `staging`, soit via Netlify UI : **Deploys → Trigger deploy → Deploy branch → staging**.

### Étape 7 — Vérifier

- https://staging--projetrfc.netlify.app/api/health → doit répondre `{"status":"ok","db":"ok"}`
- Connexion avec `admin@formapro.fr` / `admin123` → doit fonctionner si le seed a été lancé
- **Ne PAS** lancer de cron contre staging — les crons GitHub Actions ne ciblent que la prod (cf. `.github/workflows/cron.yml`)

---

## Workflow recommandé : tester une migration / feature risquée

1. **Synchroniser staging avec main** :
   ```bash
   git checkout staging
   git merge main
   git push
   ```
2. **Faire les changements à tester** : commit + push sur `staging`
3. Netlify déploye automatiquement sur `staging--projetrfc.netlify.app`
4. **Tester** : login, scénario métier ciblé, vérifier les logs Sentry (env "staging")
5. **Si OK** : porter la branche feature sur `main` via PR normale
6. **Si KO** : `git reset --hard origin/main` sur staging pour repartir propre

---

## Différences de comportement à connaître

| Comportement | Prod | Staging |
|--------------|------|---------|
| Crons GitHub Actions | Tournent toutes les schedules | Désactivés (cible URL prod uniquement) |
| Envoi emails (Nodemailer) | Vrais emails | **Doit pointer vers Mailtrap / MailHog** sinon spam des vrais users |
| Sentry environment | "production" | "staging" (filtrable dans Sentry UI) |
| Rate-limit Upstash | Distribué | Acceptable en in-memory si Upstash absent (faible trafic) |
| Données | Réelles RFC | Données de seed + données de test |

---

## Coûts attendus

| Service | Plan | Coût staging |
|---------|------|--------------|
| Supabase | Free tier | 0 € (limite 500 MB DB) |
| Netlify | Plan actuel | 0 € (build minutes partagés avec prod) |
| Upstash | Free tier ou partagé prod | 0 € |
| Sentry | Plan actuel | 0 € (events comptés tous environments confondus) |

**Total** : 0 € en plus de la prod actuelle.

---

## Suppression du staging (si besoin)

Si tu veux retirer le staging :

1. Netlify : retirer `staging` de "Branch deploys"
2. Netlify : supprimer les valeurs staging des deploy contexts (dans chaque env var)
3. Supabase : supprimer le projet `rfc-formations-staging` (Database → Settings → Danger Zone)
4. Git : `git branch -D staging && git push origin --delete staging`

---

## Liens

- [Netlify deploy contexts docs](https://docs.netlify.com/site-deploys/overview/#deploy-contexts)
- [Supabase free tier limits](https://supabase.com/pricing)
- [Procédure rotation secrets](secret-rotation.md)
- [Procédure déploiement](deployment.md)
