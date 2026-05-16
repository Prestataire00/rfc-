# Sprint Plan — RFC Formations (FormaPro CRM)

**Scrum Master** : Ismael Lepennec
**Date** : 2026-05-16
**Projet** : RFC Formations (web-app, Level 2)
**Périmètre** : Dette technique identifiée en architecture §15 (sécurité, RGPD, pipeline, ops)
**Capacité** : 1 dev solo plein temps — **~50 points / sprint** (2 semaines)
**Sources** : [Architecture §15](architecture-rfc-formations-2026-05-16.md#15-questions-ouvertes--dette-technique-identifiée), [PRD](prd-rfc-formations-2026-05-16.md)

---

## 1. Résumé exécutif

Ce plan adresse la **dette technique identifiée lors de la rétro-documentation de l'architecture** (cf. archi §15). Il **ne couvre pas** la roadmap fonctionnelle (PRD.md §8 — CPF/OPCO, agenda Google, dashboard analytique, etc.), qui fera l'objet d'un plan séparé.

**Métriques** :
- **2 sprints** de 2 semaines (4 semaines au total)
- **11 stories** (1 à 5 points chacune)
- **41 points** au total → **~41 % de la capacité combinée** (la dette est limitée — capacité résiduelle disponible pour la roadmap)
- **Date cible de complétion** : 2026-06-13 (4 semaines)

**Objectif** : sortir des risques sécurité / RGPD critiques (NSS en clair, JWT non révocables, rate-limit dégradable) et professionnaliser le pipeline (migrations Prisma versionnées en CI, tests en CI, staging) **avant** d'attaquer la roadmap fonctionnelle.

---

## 2. Inventaire des stories

### EPIC-TD-001 — Sécurité & RGPD

#### STORY-TD-001 : Chiffrer le numéro de sécurité sociale sur Contact

**Epic** : TD-001
**Priorité** : Must Have
**Estimation** : 5 points

**User Story**
En tant qu'**admin RFC**, je veux que les numéros de sécurité sociale stagiaires soient chiffrés au repos, pour limiter l'impact d'une fuite de base de données et rester conforme RGPD.

**Critères d'acceptation**
- [ ] `Contact.numeroSecuriteSociale` est chiffré en base via chiffrement applicatif (clé en env `NSS_ENCRYPTION_KEY`)
- [ ] Migration de données : tous les NSS existants sont chiffrés sans perte
- [ ] Helper de chiffrement / déchiffrement centralisé dans `lib/encryption.ts`
- [ ] Lecture transparente côté API (pas d'impact frontend visible)
- [ ] Logs ne contiennent jamais le NSS en clair (vérifier les `console.log` et Sentry)
- [ ] Le commentaire `prisma/schema.prisma:88` ("chiffrement applicatif à prevoir") est retiré
- [ ] Test unitaire chiffre + déchiffre + détecte corruption
- [ ] Rotation de clé documentée (procédure manuelle pour v1)

**Notes techniques**
- Algorithme : AES-256-GCM (auth tag intégré, recommandation OWASP)
- Stockage : `iv:authTag:ciphertext` base64 dans le même champ TEXT
- Performance : NSS lu rarement (uniquement export BPF / fiche stagiaire) → impact négligeable
- Backup : sauvegardes Supabase contiennent désormais des données chiffrées (la clé doit être conservée séparément)

**Dépendances** : aucune

---

#### STORY-TD-002 : Raccourcir TTL JWT + documenter rotation NEXTAUTH_SECRET

**Epic** : TD-001
**Priorité** : Must Have
**Estimation** : 3 points

**User Story**
En tant qu'**admin RFC**, je veux pouvoir invalider une session compromise rapidement, pour limiter la fenêtre d'attaque en cas de fuite de token ou de compte volé.

**Critères d'acceptation**
- [ ] TTL JWT abaissé à 24 h (vs valeur par défaut NextAuth de 30 j)
- [ ] Refresh transparent côté client (l'utilisateur ne se déconnecte pas)
- [ ] Désactiver un `User` (`actif: false`) coupe l'accès au prochain refresh (≤ 24 h)
- [ ] Procédure de rotation `NEXTAUTH_SECRET` documentée (impact : déconnecte tous les utilisateurs)
- [ ] Procédure documentée dans `docs/operations/secret-rotation.md`

**Notes techniques**
- Modifier `app/api/auth/[...nextauth]/route.ts` (ou équivalent)
- Vérifier comportement middleware avec TTL réduit (re-validation transparente)

**Dépendances** : aucune

---

#### STORY-TD-003 : Alerter si UPSTASH_REDIS_REST_URL non défini en prod

**Epic** : TD-001
**Priorité** : Must Have
**Estimation** : 2 points

**User Story**
En tant qu'**admin RFC**, je veux être alerté si le rate-limit dégrade silencieusement en in-memory (inefficace en serverless multi-instances), pour éviter une fenêtre de vulnérabilité non détectée.

**Critères d'acceptation**
- [ ] Au démarrage de l'app en prod (`NODE_ENV === "production"`), absence de `UPSTASH_REDIS_REST_URL` → log Sentry niveau "error" avec message explicite
- [ ] En dev, warning console acceptable (pas d'alerte Sentry)
- [ ] Vérification déplacée dans `lib/rate-limit.ts` ou hook d'initialisation
- [ ] Test unitaire vérifie le comportement

**Notes techniques**
- Pas de blocage du démarrage (graceful degradation, mais visible)
- Vérifier aussi `UPSTASH_REDIS_REST_TOKEN`

**Dépendances** : aucune

---

#### STORY-TD-004 : Registre RGPD des traitements documenté

**Epic** : TD-001
**Priorité** : Should Have
**Estimation** : 5 points

**User Story**
En tant qu'**admin RFC**, je veux disposer d'un registre des traitements RGPD à jour, pour répondre à un audit CNIL ou à une demande client en moins d'une journée.

**Critères d'acceptation**
- [ ] Document `docs/rgpd/registre-traitements.md` listant pour chaque catégorie de données : finalité, base légale, durée de conservation, destinataires, mesures de sécurité
- [ ] Couvre : `Contact` (stagiaires), `User`, données financières, communications marketing (`MarketingCampaign`, `CampaignRecipient`, opt-out), forum, IA (analyses)
- [ ] Référence le flow `DemandeRgpd` + page publique `/rgpd/demande`
- [ ] Référence le chiffrement NSS (STORY-TD-001)
- [ ] Procédure documentée pour répondre à une demande d'export et de suppression

**Notes techniques**
- Pas de code, uniquement documentation
- Peut bénéficier d'un template DPO (à fournir si dispo)

**Dépendances** : STORY-TD-001 (chiffrement NSS à mentionner)

---

### EPIC-TD-002 — Pipeline & qualité

#### STORY-TD-005 : Migrer `prisma db push` → `prisma migrate deploy` en CI

**Epic** : TD-002
**Priorité** : Must Have
**Estimation** : 5 points

**User Story**
En tant que **dev**, je veux que les migrations DB soient versionnées et appliquées automatiquement à chaque déploiement, pour éviter le drift de schéma et la dépendance à un workflow local manuel.

**Critères d'acceptation**
- [ ] Migration baseline créée à partir du schéma actuel (`prisma migrate diff --from-empty --to-schema-datamodel`) et committée dans `prisma/migrations/`
- [ ] Hook de build Netlify exécute `prisma migrate deploy` avant le start
- [ ] Documentation mise à jour dans `LANCEMENT.md` (workflow dev : `prisma migrate dev`)
- [ ] Commentaire `netlify.toml` mis à jour pour refléter le nouveau workflow
- [ ] Test sur Deploy Preview Netlify avant merge en main
- [ ] Procédure de rollback documentée (`prisma migrate resolve --rolled-back`)

**Notes techniques**
- Risque : la baseline doit matcher exactement l'état de la DB prod (sinon échec au premier migrate deploy)
- Faire en heures creuses ou sur staging d'abord (cf. STORY-TD-007)

**Dépendances** : STORY-TD-007 (staging permet de tester sans risque)

---

#### STORY-TD-006 : Câbler Vitest dans GitHub Actions sur chaque PR

**Epic** : TD-002
**Priorité** : Must Have
**Estimation** : 3 points

**User Story**
En tant que **dev**, je veux que les tests Vitest tournent automatiquement sur chaque PR, pour bloquer la merge si un test casse.

**Critères d'acceptation**
- [ ] Workflow `.github/workflows/test.yml` qui s'exécute sur `pull_request` (toutes branches → main)
- [ ] Étapes : checkout, setup Node 20, `npm ci`, `prisma generate`, `npm test`
- [ ] Status check requis pour merge sur main (GitHub branch protection)
- [ ] Cache npm pour rapidité
- [ ] Durée cible < 3 min

**Notes techniques**
- Pas de DB pour les tests Vitest unitaires (utilise `happy-dom`) — pas besoin de Supabase test
- Si tests d'intégration nécessitent DB, prévoir SQLite ou Postgres dockerisé en service

**Dépendances** : aucune (peut tourner en parallèle de TD-005)

---

#### STORY-TD-007 : Mettre en place un environnement staging

**Epic** : TD-002
**Priorité** : Should Have
**Estimation** : 5 points

**User Story**
En tant que **dev**, je veux un environnement staging pour tester migrations et features risquées sans impacter la prod.

**Critères d'acceptation**
- [ ] Branche `staging` configurée, déploiement Netlify dédié (`projetrfc-staging.netlify.app` ou équivalent)
- [ ] Base de données Supabase staging séparée (DATABASE_URL distincte)
- [ ] Variables d'environnement staging configurées (CRON_SECRET, NEXTAUTH_SECRET, UPSTASH staging, Sentry environment "staging")
- [ ] Données de seed Vitest + données de démo (`prisma/seed.ts`)
- [ ] Cron GitHub Actions désactivé pour staging (ou cible URL staging séparément)
- [ ] Documentation `docs/operations/environments.md`

**Notes techniques**
- Alternative : Netlify Deploy Preview avec branche staging et DB Supabase staging (plus simple, gratuit)
- Sentry "environment" tag pour séparer erreurs staging vs prod

**Dépendances** : aucune

---

### EPIC-TD-003 — Fiabilité & ops

#### STORY-TD-008 : Test de restore Supabase (DR drill)

**Epic** : TD-003
**Priorité** : Must Have
**Estimation** : 3 points

**User Story**
En tant qu'**admin RFC**, je veux avoir validé que les sauvegardes Supabase peuvent réellement être restaurées, pour ne pas découvrir un problème de DR le jour d'un incident.

**Critères d'acceptation**
- [ ] Snapshot Supabase prod restauré dans une DB isolée (compte Supabase test ou staging)
- [ ] Vérification de l'intégrité : nombre de modèles, comptages clés (Contacts, Sessions, Factures)
- [ ] Mesure du RTO réel (temps total de restore)
- [ ] Compte rendu écrit dans `docs/operations/dr-drill-2026-Q2.md`
- [ ] Calendrier annuel de DR drill défini (1x/an minimum)

**Notes techniques**
- Pas de modification de code
- Si plan Supabase limite les restores, peut nécessiter un upgrade temporaire

**Dépendances** : aucune

---

#### STORY-TD-009 : Monitoring uptime externe

**Epic** : TD-003
**Priorité** : Should Have
**Estimation** : 2 points

**User Story**
En tant qu'**admin RFC**, je veux être alerté en cas d'indisponibilité externe (Netlify down, DNS, certificat), pour réagir avant qu'un utilisateur ne le signale.

**Critères d'acceptation**
- [ ] Compte sur UptimeRobot / Better Uptime / Pingdom (free tier suffit)
- [ ] Check toutes les 5 min sur `https://projetrfc.netlify.app/api/health` (créer endpoint simple si pas existant)
- [ ] Alerte email vers admin en cas de 2 checks consécutifs en échec
- [ ] Page de status publique optionnelle

**Notes techniques**
- Endpoint `/api/health` : `200 OK` + `{ "status": "ok", "db": "ok|down" }` avec un `SELECT 1` Prisma
- Doit être public (pas d'auth), réponse < 500 ms

**Dépendances** : aucune

---

#### STORY-TD-010 : Re-synchroniser PRD ↔ code (FR-016+)

**Epic** : TD-003
**Priorité** : Could Have
**Estimation** : 5 points

**User Story**
En tant qu'**admin RFC**, je veux que le PRD BMAD reflète l'ensemble des fonctionnalités réellement livrées (signature électronique, IA, marketing, badges, forum, automations v2, etc.), pour disposer d'une documentation produit fidèle utilisable en audit ou onboarding.

**Critères d'acceptation**
- [ ] Ajouter FR-016 à FR-0nn pour les composants C12-C19 listés dans archi §13 (signature, émargement, marketing, badges, forum, IA, automations, tâches/projets)
- [ ] Mettre à jour la matrice de traçabilité PRD §7 (épics à ajouter ou élargir)
- [ ] Mettre à jour le product brief si nécessaire
- [ ] Le finding archi §13 peut être marqué comme "résolu"

**Notes techniques**
- Pas de code, uniquement documentation produit
- À déprioriser par rapport à la sécurité et au pipeline

**Dépendances** : aucune

---

#### STORY-TD-011 : Documenter procédures opérationnelles consolidées

**Epic** : TD-003
**Priorité** : Should Have
**Estimation** : 3 points

**User Story**
En tant que **dev / admin**, je veux un seul point d'entrée documentaire pour les procédures opérationnelles (rotation secrets, restore DR, déploiement, rollback), pour pouvoir intervenir rapidement sans rechercher dans plusieurs fichiers.

**Critères d'acceptation**
- [ ] `docs/operations/README.md` index avec liens vers : `secret-rotation.md`, `dr-drill-*.md`, `environments.md`, `deployment.md`, `incident-response.md`
- [ ] `deployment.md` : procédure de déploiement nominal + rollback Netlify
- [ ] `incident-response.md` : checklist en cas d'incident (logs Sentry, état Supabase, alertes UptimeRobot)

**Dépendances** : STORY-TD-002 (secret-rotation), STORY-TD-007 (environments), STORY-TD-008 (DR drill)

---

## 3. Allocation par sprint

### Sprint 1 — Sécurité, RGPD & qualité CI (2026-05-19 → 2026-05-30)

**Goal** : Refermer les risques sécurité critiques (NSS chiffré, JWT révocable, alerte rate-limit) et activer les tests automatiques en CI.

| Story | Points | Priorité |
|-------|--------|----------|
| STORY-TD-001 : Chiffrement NSS sur Contact | 5 | Must |
| STORY-TD-002 : TTL JWT + rotation NEXTAUTH_SECRET | 3 | Must |
| STORY-TD-003 : Alerte si UPSTASH non défini | 2 | Must |
| STORY-TD-006 : Vitest CI sur chaque PR | 3 | Must |
| STORY-TD-008 : DR drill Supabase | 3 | Must |
| STORY-TD-004 : Registre RGPD | 5 | Should |

**Total** : 21 points / 50 capacité (**42 % d'utilisation**)

**Buffer** : 29 points (58 %) — confortable pour absorber les imprévus du chiffrement NSS (data migration risquée).

**Risques sprint 1** :
- Migration des NSS existants : zéro tolérance perte de données → faire un snapshot Supabase juste avant
- Tests Vitest pourraient révéler des régressions latentes à corriger

**Démos / sortie de sprint** :
- Démo chiffrement : afficher un NSS en clair côté API, voir le ciphertext en base
- Démo TTL JWT : se logger, désactiver le compte, attester de la déconnexion < 24 h
- CI verte sur PR de démo

---

### Sprint 2 — Pipeline & ops (2026-06-02 → 2026-06-13)

**Goal** : Industrialiser le déploiement (migrations versionnées en CI, environnement staging) et renforcer la surveillance et la documentation opérationnelle.

| Story | Points | Priorité |
|-------|--------|----------|
| STORY-TD-007 : Environnement staging | 5 | Should |
| STORY-TD-005 : `prisma migrate deploy` en CI | 5 | Must |
| STORY-TD-009 : Monitoring uptime externe | 2 | Should |
| STORY-TD-011 : Documentation procédures ops consolidées | 3 | Should |
| STORY-TD-010 : Re-synchronisation PRD ↔ code (FR-016+) | 5 | Could |

**Total** : 20 points / 50 capacité (**40 % d'utilisation**)

**Buffer** : 30 points (60 %) — disponible pour démarrer une story de **roadmap PRD.md §8** si l'équipe est en avance (suggestions : intégration agenda Google = forte valeur formateurs).

**Risques sprint 2** :
- Migration baseline Prisma : le diff doit matcher exactement la prod, sinon premier `migrate deploy` casse → tester d'abord sur staging (TD-007 d'où dépendance)
- TD-010 documentation : peut déborder selon le niveau de détail souhaité — capper à 5 pts strictement

**Démos / sortie de sprint** :
- Déploiement test sur staging puis prod via `migrate deploy`
- PR de démo qui ajoute une colonne neutre → migration générée → déployée en prod
- Alerte UptimeRobot reçue suite à un down volontaire de l'endpoint staging
- Index `docs/operations/README.md` consultable

---

## 4. Traçabilité

### Stories ↔ archi §15 (origine de la dette)

| Story | Item archi §15 |
|-------|----------------|
| STORY-TD-001 | §15.6 — NSS en clair sur Contact |
| STORY-TD-002 | §15.7 — JWT révocation |
| STORY-TD-003 | §15.4 — Rate-limit fallback |
| STORY-TD-004 | (complémentaire NFR-004 RGPD) |
| STORY-TD-005 | §15.1 — Migrations Prisma |
| STORY-TD-006 | §15.3 — Tests CI |
| STORY-TD-007 | §15.2 — Environnement staging |
| STORY-TD-008 | §15.9 — Backups Supabase |
| STORY-TD-009 | (complémentaire NFR-002 disponibilité) |
| STORY-TD-010 | §15.8 — PRD vs code |
| STORY-TD-011 | §15.10 — Documentation utilisateur (partielle, scope ops) |

### Stories ↔ NFRs renforcés

| Story | NFR renforcée |
|-------|---------------|
| STORY-TD-001 | NFR-003 Sécurité, NFR-004 RGPD |
| STORY-TD-002 | NFR-003 Sécurité |
| STORY-TD-003 | NFR-003 Sécurité |
| STORY-TD-004 | NFR-004 RGPD |
| STORY-TD-005 | NFR-007 Maintenabilité |
| STORY-TD-006 | NFR-007 Maintenabilité |
| STORY-TD-007 | NFR-007 Maintenabilité |
| STORY-TD-008 | NFR-002 Disponibilité |
| STORY-TD-009 | NFR-002 Disponibilité |

---

## 5. Risques & mitigations

| Sévérité | Risque | Mitigation |
|----------|--------|------------|
| **Haute** | Migration NSS perd des données | Snapshot Supabase juste avant, test sur staging d'abord, rollback préparé |
| **Haute** | Baseline Prisma ne match pas la prod → `migrate deploy` casse | Tester sur staging (DB clone) avant prod, rollback documenté |
| **Moyenne** | TTL JWT 24h dégrade l'UX si refresh mal géré | Test E2E flow connexion sur plusieurs heures, valider sur staging |
| **Moyenne** | UptimeRobot free tier trop limité | Plan payant si besoin (~10$/mois) ou migration vers Better Uptime |
| **Faible** | Documentation déborde en pages | Time-box strict, viser la concision |

---

## 6. Dépendances

### Internes (entre stories)
- TD-005 → TD-007 (migrate deploy testé sur staging)
- TD-011 → TD-002, TD-007, TD-008 (documente les procédures issues de ces stories)
- TD-004 → TD-001 (registre RGPD mentionne le chiffrement NSS)

### Externes
- Compte UptimeRobot ou équivalent (free tier ou paid)
- Plan Supabase permettant un restore test (vérifier)
- Accès GitHub repo settings pour configurer branch protection

---

## 7. Definition of Done

Pour qu'une story soit considérée terminée :
- [ ] Code implémenté et committé
- [ ] Tests Vitest écrits et passants (couverture du nouveau code ≥ 70 %)
- [ ] Pull request créée, CI verte
- [ ] Revue de code (auto-revue minimum si solo)
- [ ] Documentation mise à jour (`docs/`, `README.md`, `LANCEMENT.md` selon contexte)
- [ ] Déploiement sur staging validé (après que STORY-TD-007 soit livrée)
- [ ] Déploiement prod confirmé sans alerte Sentry sur 24 h
- [ ] Critères d'acceptation cochés un à un

---

## 8. Cadence

- **Sprint length** : 2 semaines
- **Sprint planning** : ce document
- **Sprint review** : démo des stories Must Have terminées
- **Sprint retrospective** : revue rapide en fin de sprint, ajustements pour le suivant
- **Daily** : pas de daily formel (équipe solo) — suivi via `docs/sprint-status.yaml`

---

## 9. Prochaines étapes

**Immédiat** : démarrer Sprint 1 par la story à plus fort risque/valeur : **STORY-TD-001** (chiffrement NSS).

**Commandes utiles** :
- `/bmad:create-story STORY-TD-001` — générer le doc story détaillé
- `/bmad:dev-story STORY-TD-001` — démarrer l'implémentation

**Après Sprint 2** : passer à la **roadmap fonctionnelle PRD.md §8** (CPF/OPCO, agenda Google, dashboard analytique, app mobile, marketplace, chatbot, multi-organismes) via un nouveau cycle `/bmad:sprint-planning`.

---

*Document généré par le workflow `/bmad:sprint-planning` le 2026-05-16. Source de la dette : [architecture §15](architecture-rfc-formations-2026-05-16.md#15-questions-ouvertes--dette-technique-identifiée).*
