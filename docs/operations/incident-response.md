# Réponse à incident

**Quand** : détection d'un incident prod (alerte Sentry, signalement utilisateur, monitoring uptime, comportement anormal).
**Qui** : Owner RFC + prestataire dev (selon nature).
**Impact** : variable. Objectif = limiter, communiquer, documenter.

---

## Niveaux de sévérité

| Niveau | Définition | Délai cible de réaction |
|--------|------------|-------------------------|
| **P0** — Critique | App down (HTTP 5xx généralisés), fuite de données, perte de données | < 15 min |
| **P1** — Élevé | Fonctionnalité cœur cassée (login, devis, factures, signature) | < 1 h |
| **P2** — Moyen | Régression sur fonctionnalité secondaire, faible impact utilisateur | < 1 jour |
| **P3** — Faible | Bug mineur, contournement existe | < 1 semaine |

---

## Checklist immédiate (P0 / P1)

### 1. Confirmer l'incident (5 min)

- [ ] **Sentry** : ouvrir [le dashboard erreurs](https://sentry.io) — pic d'erreurs récent ?
- [ ] **Netlify** : statut deploy actuel + dernière modification
- [ ] **Supabase** : statut DB (UI Supabase → Project → Health)
- [ ] **Upstream services** : status pages Netlify, Supabase, Anthropic, Upstash
- [ ] **Reproduire** : tester soi-même le scénario problématique

### 2. Évaluer (5 min)

- Quelle fonctionnalité est cassée ?
- Combien d'utilisateurs impactés (admin only / formateurs / clients / stagiaires) ?
- Y a-t-il un risque RGPD / fuite de données ?
- Y a-t-il un risque financier (factures mal générées, paiements perdus) ?

### 3. Stabiliser (15 min)

**Selon la cause probable** :

| Cause suspectée | Action de stabilisation |
|-----------------|--------------------------|
| Mauvais déploiement récent | [Rollback Netlify](deployment.md#rollback) |
| Migration DB cassée | Restore Supabase snapshot + rollback Netlify |
| Service externe down (Anthropic, Upstash) | Désactiver la feature concernée (feature flag ou commentaire temporaire) |
| Pic de charge | Vérifier rate-limit Upstash actif, scale Supabase si nécessaire |
| Secret compromis | [Rotation immédiate](secret-rotation.md) |
| Suspicion de bug applicatif | Rollback préventif puis investigation à froid |

### 4. Communiquer (en parallèle)

- **Sévérité P0/P1** : email aux admins RFC + post-it visible sur dashboard
- **Mention de la fenêtre** : "incident détecté à HH:MM, résolution en cours"
- **Évite la sur-promesse** : "nous y travaillons" plutôt qu'un ETA précis

### 5. Documenter pendant l'incident

Noter au fil de l'eau dans un fichier `docs/operations/incident-YYYY-MM-DD-<slug>.md` :
- Timeline (heure de détection, actions, résolution)
- Hypothèses testées / écartées
- Commandes exécutées
- Captures d'écran Sentry / Supabase / Netlify

---

## Post-mortem (sous 48h après l'incident)

Compléter le fichier `incident-YYYY-MM-DD-<slug>.md` avec :

```markdown
# Incident YYYY-MM-DD — <titre>

**Sévérité** : P0 / P1 / P2 / P3
**Durée** : HH:MM → HH:MM (Xh Ymin)
**Impact** : <fonctionnalités cassées, utilisateurs impactés>

## Timeline

- HH:MM — Détection (Sentry / utilisateur / monitoring)
- HH:MM — Confirmation
- HH:MM — Action 1
- HH:MM — Action N
- HH:MM — Résolution

## Cause racine

<analyse — pas juste "le code a planté", mais le pourquoi en profondeur>

## Actions correctives (court terme)

- [ ] Fix appliqué
- [ ] Vérifications post-fix

## Actions préventives (moyen terme)

- [ ] Test ajouté pour éviter régression
- [ ] Monitoring renforcé
- [ ] Documentation mise à jour
- [ ] Process changé

## Leçons apprises

<ce qu'on a appris pour la prochaine fois>
```

---

## Cas particuliers

### Fuite de données suspectée (incident RGPD)

1. Stabiliser le périmètre (couper l'accès à la source de fuite)
2. **[Rotation immédiate](secret-rotation.md)** de tous les secrets potentiellement exposés
3. Évaluer l'ampleur (combien de personnes, quelles données)
4. **Sous 72h** : notification CNIL si risque pour les personnes concernées (téléservice : [notifications.cnil.fr](https://notifications.cnil.fr))
5. **Si risque élevé** : notification aux personnes concernées (lettre / email)
6. Post-mortem documenté + registre des traitements ([docs/rgpd/registre-traitements.md](../rgpd/registre-traitements.md)) mis à jour si nouveau traitement révélé

### Tentative d'intrusion détectée

- Pic de tentatives login échouées sur un compte : utiliser `lib/rate-limit.ts` (déjà actif)
- Pic de tentatives signature électronique : `SignatureTokenAttempt` enregistre tout, analyser les IPs source
- Si compromission confirmée : `User.actif = false` sur les comptes concernés + rotation `NEXTAUTH_SECRET`

### Cron qui ne tourne plus

- Vérifier l'onglet **Actions** GitHub → workflow `Crons RFC`
- Si échec : vérifier `CRON_SECRET` en sync GitHub Secrets ↔ Netlify env
- Trigger manuel via `workflow_dispatch` pour rattraper

---

## Liens

- [Sentry](https://sentry.io)
- [Netlify dashboard](https://app.netlify.com)
- [Supabase dashboard](https://supabase.com/dashboard)
- [GitHub Actions](https://github.com/Prestataire00/rfc-/actions)
- [Procédure déploiement / rollback](deployment.md)
- [Rotation des secrets](secret-rotation.md)
- [Registre RGPD](../rgpd/registre-traitements.md)
