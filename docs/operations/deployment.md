# Déploiement & rollback

**Quand** : à chaque release sur `main` (Netlify déclenche automatiquement).
**Qui** : tout dev avec accès push `main` + admin Netlify.
**Impact** : déploiement Netlify atomic-deploy (zero downtime). Rollback en 1 clic.

---

## Déploiement nominal

### Mécanisme

1. Push sur `main` (typiquement via merge d'une PR)
2. Netlify détecte le push → trigger un build via `@netlify/plugin-nextjs`
3. Build :
   - `npm ci` (installe deps, déclenche `postinstall` → `prisma generate`)
   - `npm run build` (Next.js build production)
4. Netlify atomic-deploy : nouvelle version mise en ligne, ancienne instance kept warm pour rollback
5. Crons GitHub Actions continuent à pointer vers `https://projetrfc.netlify.app`

### Pré-requis

- Variables d'environnement Netlify à jour (cf. `.env.example`)
- `NEXTAUTH_SECRET`, `DATABASE_URL`, `NSS_ENCRYPTION_KEY`, `CRON_SECRET`, etc.

### Vérifications post-déploiement

À effectuer **systématiquement** dans les 10 min suivant un déploiement :

- [ ] Page `https://projetrfc.netlify.app` répond 200
- [ ] Login admin fonctionne
- [ ] Pas d'alerte Sentry dans les minutes suivant le déploiement
- [ ] Un cron récent (cf. GitHub Actions Scheduled) est passé en succès
- [ ] Test fumée : ouvrir une fiche contact → NSS s'affiche (TD-001)

---

## Rollback

### Quand rollback

- Erreur 500 systématique sur les pages principales
- Pic d'alertes Sentry après déploiement
- Migration de données corrompue
- Régression fonctionnelle critique signalée

### Procédure (Netlify)

1. **Netlify Dashboard** → site `projetrfc` → onglet **Deploys**
2. Identifier le **dernier déploiement OK** (état = "Published" avant la régression)
3. Cliquer sur ce déploiement → bouton **Publish deploy**
4. Confirmer

**Délai** : ~30 secondes (le déploiement est déjà compilé, Netlify ne fait que repointer le DNS interne).

### Procédure (git)

Si on veut figer le rollback dans git :

```bash
git checkout main
git revert <hash-du-commit-cassé> --no-edit
git push origin main
```

Le push déclenche un nouveau build sur Netlify, qui livre la version revertée.

⚠️ **Ne JAMAIS faire `git reset --hard` + `git push --force origin main`** : ça réécrit l'historique de `main`, casse les forks/PRs en cours, et n'est pas la bonne procédure.

### Cas particulier : migration DB irréversible

Si le déploiement cassé a appliqué une migration de schéma **non-rétrocompatible** (drop de colonne, type incompatible), un simple rollback Netlify ne suffit pas — le code revenu en arrière ne tournera pas contre le nouveau schéma.

**Procédure** :
1. Restore DB à partir d'un snapshot Supabase **antérieur à la migration**
2. Rollback Netlify
3. Post-mortem : pourquoi la migration n'a-t-elle pas été testée sur staging avant ?

---

## Déploiement d'urgence (hotfix)

1. Créer une branche `hotfix/<slug>` depuis `main`
2. Commiter le fix minimal (1 commit idéalement)
3. PR vers `main`, **review accéléré** (un autre dev sanity-check)
4. Merge → déploiement auto Netlify
5. Vérification post-déploiement (checklist ci-dessus)
6. Si le hotfix concerne la sécurité : **annoncer aux utilisateurs admin** la nature du fix

---

## Liens

- [Netlify dashboard](https://app.netlify.com)
- [GitHub Actions runs](https://github.com/Prestataire00/rfc-/actions)
- [Sentry issues](https://sentry.io)
- [Procédure incident](incident-response.md)
- [Rotation secrets](secret-rotation.md)
