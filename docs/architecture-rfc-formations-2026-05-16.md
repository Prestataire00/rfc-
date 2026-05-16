# Architecture — RFC Formations (FormaPro CRM)

**Auteur** : Ismael Lepennec
**Date** : 2026-05-16
**Projet** : RFC Formations (web-app, Level 2)
**Version** : 1.0 (rétro-documentation de la prod actuelle)
**Sources** : code en production (`/Users/anissa/rfc-`), [PRD](prd-rfc-formations-2026-05-16.md), [Product Brief](product-brief-rfc-formations-2026-05-16.md), [PRD.md](../PRD.md) (avril 2026)

> **Note importante** : ce document décrit l'architecture **réelle telle que livrée**, qui dépasse significativement le périmètre v1 décrit dans `PRD.md` et dans le PRD BMAD précédent. Cf. §13 pour l'analyse de l'écart.

---

## 1. Drivers architecturaux

Les NFRs qui orientent les choix structurants :

| NFR | Driver | Impact architectural |
|-----|--------|----------------------|
| NFR-005 Qualiopi | Traçabilité documentaire complète, preuves attachées | Stockage Supabase Storage, modèle historique d'actions, audit log |
| NFR-004 RGPD | Hébergement EU, droit à l'effacement | Supabase EU, modèle `DemandeRgpd`, opt-out marketing modélisé sur `Contact` |
| NFR-003 Sécurité | Multi-rôle, ressources publiques tokenisées | Middleware Next.js global, NextAuth JWT, HMAC pour signature, Bearer pour crons |
| NFR-001 Performance | Déploiement serverless, charge faible (PME) | Pas de SSR lourd, pdfmake en server function, Upstash Redis pour rate-limit cross-instances |
| NFR-002 Disponibilité | 99 % heures ouvrées | Supabase managé + Netlify CDN + Sentry pour détection |
| NFR-007 Maintenabilité | Équipe restreinte | Stack mainstream, Prisma + Zod, structure App Router conventionnelle |

---

## 2. Pattern d'architecture

**Pattern retenu** : **Monolithe modulaire serverless** sur Next.js App Router.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Client (Browser, Mobile responsive)                                 │
│  ├─ /dashboard, /catalogue, /commercial, ... (admin pages)           │
│  ├─ /espace-formateur/* (portail formateur)                          │
│  ├─ /espace-client/* (portail client)                                │
│  └─ Pages publiques tokenisées (/evaluation, /sign, /emargement…)    │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Netlify Edge / Functions (Next.js 14 App Router)                    │
│  ├─ middleware.ts (auth + autorisation RBAC + tokens publics)        │
│  ├─ Server Components / Server Actions                               │
│  └─ Route Handlers /api/* (REST)                                     │
└─┬──────────────┬──────────────┬──────────────┬───────────────┬──────┘
  │              │              │              │               │
  ▼              ▼              ▼              ▼               ▼
┌────────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐
│Supabase│  │Supabase│  │  SMTP    │  │ Anthropic    │  │ Upstash  │
│Postgres│  │Storage │  │(Nodemail)│  │ Claude (IA)  │  │  Redis   │
│(Prisma)│  │(PDFs)  │  │          │  │              │  │(ratelimit)│
└────────┘  └────────┘  └──────────┘  └──────────────┘  └──────────┘
                                │             │
                                ▼             ▼
                          ┌──────────┐  ┌──────────┐
                          │ FreeTSA  │  │  Sentry  │
                          │(timestamp│  │(error +  │
                          │ signature)│  │ perf)    │
                          └──────────┘  └──────────┘

  ┌──────────────────────────────────────────────────────────┐
  │  GitHub Actions Scheduled (Bearer CRON_SECRET)           │
  │  ├─ 07h UTC : /api/cron/recyclages                       │
  │  ├─ 08h UTC : /api/cron/evaluations (J+21 à froid)       │
  │  ├─ 09h UTC : /api/cron/factures                         │
  │  ├─ */15 min : /api/cron/automations-v2                  │
  │  ├─ */5 min : /api/cron/signature-retry-finalization     │
  │  ├─ 02h UTC : /api/cron/signature-expirations            │
  │  └─ 09h15 UTC : /api/cron/signature-reminders            │
  └──────────────────────────────────────────────────────────┘
```

**Rationale** : la cible (PME, équipe < 10, charge modérée) ne justifie pas un découpage microservices. Un monolithe modulaire reste opérable par une équipe restreinte, déploiement atomique, debug simple. Les modules sont délimités par dossier (`app/<domaine>` + `lib/<domaine>`), pas par déploiement.

---

## 3. Stack technique

### Frontend
| Élément | Choix | Justification |
|---------|-------|---------------|
| Framework | **Next.js 14** (App Router) | SSR/SSG + API routes dans un seul projet, écosystème mainstream, déploiement Netlify natif |
| Langage | **TypeScript 5** (strict) | Typage end-to-end avec Prisma client + Zod |
| Style | **Tailwind 3** + `class-variance-authority` + `tailwind-merge` | Stack design system minimaliste |
| Composants | Convention shadcn-like (`components.json`) | Composants accessibles, contrôlés en local |
| Formulaires | **React Hook Form** + **Zod** + `@hookform/resolvers` | Validation typée partagée client/serveur |
| Data client | **SWR 2** | Cache + revalidation, simple |
| Rich text | **TipTap 3** (StarterKit + extensions) | Pour message templates, descriptions formations |
| Notifications UI | **Sonner** | Toast léger |
| Icônes | **lucide-react** | |
| Email rendering | **@react-email/components** + render | Templates email composés en React |
| Sanitization | **isomorphic-dompurify** | Sécurité affichage HTML utilisateur |

### Backend & data
| Élément | Choix | Justification |
|---------|-------|---------------|
| Runtime | Node 20 (Netlify Functions) | Serverless serverless-natif Next.js |
| ORM | **Prisma 5** | Migrations typées, client généré, écosystème |
| DB | **PostgreSQL** via **Supabase** | Managé EU, backups automatiques, plan évolutif |
| Storage fichiers | **Supabase Storage** (via `@supabase/supabase-js`) | PDFs générés, pièces jointes, photos |
| Auth | **NextAuth v4** (Credentials provider + JWT) | Pas d'OAuth externe requis, sessions JWT compatibles edge middleware |
| Hash mots de passe | **bcryptjs** | Standard, sans dépendance native |
| PDF | **pdfmake 0.2** + **pdf-lib 1.17** + `@pdf-lib/fontkit` | pdfmake pour génération depuis schémas JSON, pdf-lib pour manipulation/signature (positions, hash) |
| Lecture PDF | **pdfjs-dist** | Extraction texte côté serveur (analyse IA) |
| QR codes | **qrcode** | Émargement, badges |
| Email transport | **Nodemailer 7** | SMTP configurable (org client) |
| IA | **@anthropic-ai/sdk 0.82** | Analyse de documents (Claude) |

### Infrastructure & outillage
| Élément | Choix | Justification |
|---------|-------|---------------|
| Hébergement | **Netlify** (`@netlify/plugin-nextjs`) | Déploiement continu GitHub, Edge Functions, gratuit/économique pour la charge cible |
| Crons | **GitHub Actions Scheduled** (Bearer `CRON_SECRET`) | Substitut aux crons Netlify qui ne peuvent pas signer (cf. `netlify.toml` + `.github/workflows/cron.yml`) |
| Rate limiting | **@upstash/ratelimit** + **@upstash/redis** | Cross-instances Netlify (in-memory inefficace en serverless) |
| Monitoring erreurs | **@sentry/nextjs 10** | Stack traces, perf, déjà câblé client+server+edge |
| Tests | **Vitest 4** + `happy-dom` | Tests unitaires rapides, ESM-natif |
| CI | GitHub Actions | (cf. `.github/workflows/`) |
| Sandbox sécurité | `lib/ai-guard.ts`, `lib/with-rate-limit.ts`, `lib/api-wrapper.ts`, `lib/rate-limit-presets.ts` | Couche défensive applicative |

### Signature électronique (custom, self-hosted)
| Élément | Choix | Justification |
|---------|-------|---------------|
| Tokens magiques | HMAC (`SECRET_HMAC_TOKENS`, rotation possible via `_OLD`) | Pas de compte signataire requis, expiration configurable |
| Horodatage | **FreeTSA** (gratuit, RFC 3161) | Preuve d'antériorité, vérifiable indépendamment |
| Manipulation PDF | **pdf-lib** | Placement signature, hash document |
| Audit | Modèles dédiés (`SignatureRequest`, `Signataire`, `SignatureEvent`, `SignatureTokenAttempt`) | Traçabilité tentatives + finalisations |
| Spec | `docs/superpowers/specs/2026-05-12-signature-electronique-self-hosted-design.md` | |

---

## 4. Composants logiques

> Le monolithe est découpé en domaines fonctionnels reflétés dans `app/` et `lib/`. Chaque composant est un dossier de pages + un sous-dossier `app/api/<domaine>` + des helpers `lib/`.

### C1 — CRM (Entreprises, Contacts, Prospects, Tags)
- Pages : `/contacts`, `/entreprises` (implicite via fiches)
- API : `/api/contacts`, `/api/entreprises`, `/api/tags`, `/api/pappers` (enrichissement SIRET)
- Modèles : `Entreprise`, `Contact`, `Prospect`, `ProspectActivity`, `Tag`, `ContactTag`, `EntrepriseTag`
- FRs couvertes : FR-001

### C2 — Catalogue & sessions
- Pages : `/catalogue`, `/formations`, `/sessions`, `/lieux-formation`, `/parcours`
- API : `/api/formations`, `/api/sessions`, `/api/lieux-formation`, `/api/parcours`
- Modèles : `Formation`, `LieuFormation`, `Session`, `Inscription`, `Parcours`, `ParcoursModule`, `SessionParcours`
- FRs couvertes : FR-002, FR-003

### C3 — Formateurs (interne)
- Pages : `/formateurs`, `/competences`
- API : `/api/formateurs`, `/api/competences`, `/api/factures-formateur`, `/api/evaluations-formateur`
- Modèles : `Formateur`, `Disponibilite`, `FormateurCompetence`, `CompetenceReferentiel`, `FormateurCompetence`, `FactureFormateur`, `EvaluationFormateur`

### C4 — Portail Formateur (externe)
- Pages : `/espace-formateur/*`
- API : `/api/formateur/*`, `/api/notes-frais` (autorisation par handler)
- Modèles : `NoteFrais`, `ClasseVirtuelle`
- FRs couvertes : FR-012

### C5 — Portail Client (externe)
- Pages : `/espace-client/*`
- API : `/api/client/*`
- FRs couvertes : FR-013

### C6 — Commerce
- Pages : `/commercial`, `/besoins`, `/fiches-besoin`, `/fiche-besoin-client/[token]` (public), `/fiche-besoin-stagiaire/[token]` (public)
- API : `/api/devis`, `/api/factures`, `/api/besoins`, `/api/besoin-client`, `/api/besoin-stagiaire`, `/api/financements`, `/api/paiements`, `/api/echeanciers`
- Modèles : `Devis`, `LigneDevis`, `Facture`, `BesoinFormation`, `BesoinClient`, `BesoinStagiaire`, `Financement`, `Paiement`, `EcheancierPaiement`, `TransactionBancaire`
- FRs couvertes : FR-004, FR-005, FR-006, FR-007

### C7 — Documents pédagogiques & génération PDF
- Pages : `/documents`, `/generated-documents` (implicite), `/document-templates`
- API : `/api/documents`, `/api/document-templates`, `/api/document-categories`, `/api/pdf/*`, `/api/attestations`, `/api/generated-documents`
- Modèles : `Document`, `DocumentCategory`, `DocumentTemplate`, `GeneratedDocument`, `Attestation`, `FeuillePresence`, `EmargementToken`
- Libs : `lib/document-templates.ts`, `lib/pdf/*`
- FRs couvertes : FR-008

### C8 — Évaluations à chaud / à froid
- Pages : `/evaluations`, `/evaluation/[token]` (public)
- API : `/api/evaluations`, `/api/evaluations/public`, `/api/evaluation-templates`
- Modèles : `Evaluation`, `EvaluationTemplate`, `QuestionnaireConfig`, `FeedbackFormateur`
- Cron : `/api/cron/evaluations` (J+21, déclenché 08h UTC)
- FRs couvertes : FR-009

### C9 — Émargement numérique (QR)
- Pages : `/emargement/[token]` (public)
- API : `/api/emargement/public`
- Modèles : `EmargementToken`
- Lib : `qrcode` pour génération QR

### C10 — Qualiopi & qualité
- Pages : `/qualiopi`, `/qualite`, `/qualite/share/[token]` (public)
- API : `/api/qualiopi`, `/api/qualite/public/*`
- Modèles : `ActionQualite`, `IncidentQualite`, `PartageQualiopi`
- FRs couvertes : FR-010

### C11 — BPF
- Pages : `/bpf`
- API : `/api/bpf`
- FRs couvertes : FR-011 (calcul agrégé sur `Session`, `Inscription`, `Facture`)

### C12 — Signature électronique
- Pages : `/sign/[token]` (public, HMAC), `/signatures` (admin), `/verify` (vérification publique)
- API : `/api/sign/*`, `/api/signature-requests`, `/api/signature-requests/verify`
- Modèles : `SignatureRequest`, `SignatureZone`, `Signataire`, `SignatureEvent`, `SignatureTokenAttempt`, `SignatureDocument`
- Libs : `lib/signatures/*`
- Crons : retry (5 min), expirations (02h), reminders (09h15)
- External : FreeTSA (timestamping RFC 3161)

### C13 — Marketing & campagnes
- Pages : `/campaigns` (implicite via admin)
- API : `/api/campaigns`, `/api/campaigns/unsubscribe` (public), `/api/email-tracking/webhook` (public)
- Modèles : `MarketingCampaign`, `CampaignRecipient`, `MarketingOptOut`, `EmailTrackingEvent`, `LogEmail`

### C14 — Badges digitaux
- Pages : `/badges`, `/badges/[token]` (public)
- API : `/api/badges`, `/api/badges/verify` (public)
- Modèles : `DigitalBadge`, `BadgeAward`

### C15 — Forum & messagerie interne
- Pages : `/messagerie`
- API : `/api/forum`, `/api/conversations`
- Modèles : `ForumTopic`, `ForumReply`, `DirectMessage`, `Conversation`, `ConversationParticipant`, `ConversationMessage`

### C16 — IA (analyse documents)
- API : `/api/ai` (admin uniquement)
- Modèles : `AiDocumentAnalysis`
- Libs : `lib/ai.ts`, `lib/ai-guard.ts` (anti-abus)
- External : Anthropic Claude

### C17 — Automations
- Pages : `/admin` (implicite)
- API : `/api/automations`, `/api/automations-v2`, `/api/cron/automations-v2` (toutes 15 min)
- Modèles : `AutomationRule`, `SessionAutomation`, `AutomationRuleV2`, `AutomationExecutionV2`
- Libs : `lib/automations.ts`, `lib/automations-v2.ts`, `lib/automations-trigger.ts`, `lib/automations-v2-constants.ts`

### C18 — Templates & champs personnalisés
- API : `/api/document-templates`, `/api/message-templates`
- Modèles : `DocumentTemplate`, `MessageTemplate`, `SmsTemplate`, `ChampPersonnalise`, `ValeurChampPersonnalise`

### C19 — Tâches & projets
- Pages : `/tasks`, `/projets`
- API : `/api/projets`
- Modèles : `TaskList`, `TaskItem`, `TaskComment`, `Projet`, `ProjetFormateur`

### C20 — Plateforme transverse
- Auth & utilisateurs : `User`, `/api/utilisateurs`, `/login`
- Notifications : `Notification`, `/api/notifications`, `/notifications`
- Historique : `HistoriqueAction`, `/api/historique`
- Paramètres : `Parametres` (singleton), `/api/parametres`, `/parametres`
- RGPD : `DemandeRgpd`, `/rgpd/demande` (public)
- KPIs : `KpiHistory`, `/api/kpi`, `/dashboard`
- API keys : `ApiKey`, `/api/...`
- FRs couvertes : FR-014, FR-015

**Total** : 20 composants logiques regroupant 88 modèles Prisma et ~70 préfixes d'API.

---

## 5. Modèle de données

**Vue d'ensemble** (groupée par domaine ; 88 modèles au total) :

```
AUTH                  CRM                       CATALOGUE & SESSIONS
└─ User              ├─ Entreprise              ├─ Formation
                     │  ├─ Contact             │  └─ Parcours
                     │  ├─ Devis (→ Facture)    │     └─ ParcoursModule
                     │  ├─ Facture              ├─ LieuFormation
                     │  ├─ BesoinFormation      ├─ Session
                     │  ├─ Financement          │  ├─ Inscription (→ Contact)
                     │  └─ Document             │  ├─ FeuillePresence
                     ├─ Contact ──┐             │  │  └─ EmargementToken
                     ├─ Prospect  │             │  ├─ Evaluation (→ Token)
                     │  └─ ProspectActivity     │  ├─ FeedbackFormateur
                     ├─ Tag                     │  ├─ Attestation
                     └─ (EntrepriseTag,         │  └─ SessionParcours
                         ContactTag)            └─ EvaluationTemplate

FORMATEURS                          COMMERCE (suite)
├─ Formateur                        ├─ LigneDevis
│  ├─ Disponibilite                 ├─ BesoinClient (token public)
│  ├─ FormateurCompetence           ├─ BesoinStagiaire (token public)
│  └─ NoteFrais                     ├─ Paiement
├─ CompetenceReferentiel            ├─ EcheancierPaiement
└─ EvaluationFormateur              ├─ TransactionBancaire
                                    └─ FactureFormateur

DOCS & TEMPLATES                    QUALITÉ & QUALIOPI
├─ Document                         ├─ ActionQualite
├─ DocumentCategory                 ├─ IncidentQualite
├─ DocumentTemplate                 └─ PartageQualiopi (token public)
├─ GeneratedDocument
└─ ChampPersonnalise                MARKETING & EMAIL
   └─ ValeurChampPersonnalise       ├─ MarketingCampaign
                                    ├─ CampaignRecipient
SIGNATURE ÉLECTRONIQUE              ├─ MarketingOptOut
├─ SignatureRequest                 ├─ LogEmail
│  ├─ SignatureZone                 ├─ EmailTrackingEvent
│  ├─ Signataire                    └─ LogSms / SmsTemplate
│  └─ SignatureEvent
├─ SignatureTokenAttempt            BADGES & CERTIFS
└─ SignatureDocument                ├─ DigitalBadge / BadgeAward
                                    └─ CertificationStagiaire
FORUM & MESSAGERIE
├─ ForumTopic / ForumReply          IA & AUTOMATIONS
├─ DirectMessage                    ├─ AiDocumentAnalysis
├─ Conversation                     ├─ AutomationRule + SessionAutomation
├─ ConversationParticipant          └─ AutomationRuleV2
└─ ConversationMessage                 └─ AutomationExecutionV2

TÂCHES & PROJETS                    PLATEFORME
├─ TaskList                         ├─ Notification
├─ TaskItem                         ├─ HistoriqueAction
├─ TaskComment                      ├─ Parametres (singleton)
├─ Projet                           ├─ KpiHistory
└─ ProjetFormateur                  ├─ DemandeRgpd
                                    ├─ ApiKey
CLASSES VIRTUELLES                  └─ QuestionnaireConfig
└─ ClasseVirtuelle
```

**Conventions** :
- IDs : `cuid()` (collisions-safe, ordonnés, courts)
- Timestamps : `createdAt @default(now())` + `updatedAt @updatedAt` systématiques
- Soft-delete : pas généralisé — préférer `actif: Boolean` ou statut explicite
- Tokens publics : champs dédiés sur les modèles concernés (`Evaluation`, `BesoinClient`, `BesoinStagiaire`, `EmargementToken`), HMAC pour la signature
- RGPD : `optOutMarketing` sur `Contact` ; `DemandeRgpd` pour les requêtes formelles
- Tags : pattern many-to-many explicite (`ContactTag`, `EntrepriseTag`)

---

## 6. API

### Architecture
- **Style** : REST sur App Router (`app/api/<resource>/route.ts`)
- **Format** : JSON
- **Versioning** : pas de préfixe `/v1/` (mono-version, monolithe interne)
- **Auth** :
  - Sessions NextAuth (JWT cookie) pour admin / formateur / client
  - Bearer `CRON_SECRET` pour `/api/cron/*`
  - HMAC token pour `/api/sign/*` et `/sign/[token]`
  - Tokens UUID pour `/api/evaluations/public`, `/api/inscription-publique`, `/api/besoin-client/public`, `/api/besoin-stagiaire/public`, `/api/emargement/public`, `/api/qualite/public/*`, `/api/badges/verify`

### Conventions de réponses
- Succès 2xx : `{ data: ... }` ou ressource directe
- Erreurs : `{ error: string }` avec status approprié (401, 403, 404, 422, 500)
- Erreurs middleware : 401 "Non authentifié", 403 "Accès interdit"

### Couches transverses
- `lib/api-wrapper.ts` : wrapper pour route handlers (gestion erreurs, logs)
- `lib/with-rate-limit.ts` + `lib/rate-limit-presets.ts` : décorateurs rate-limit
- `lib/validations/*` : schémas Zod réutilisables

### Préfixes principaux (admin)
`/api/ai`, `/api/automations`, `/api/automations-v2`, `/api/badges`, `/api/besoins`, `/api/besoin-client`, `/api/besoin-stagiaire`, `/api/bpf`, `/api/campaigns`, `/api/classes-virtuelles`, `/api/competences`, `/api/contacts`, `/api/devis`, `/api/documents`, `/api/document-templates`, `/api/email`, `/api/entreprises`, `/api/evaluations`, `/api/export`, `/api/factures`, `/api/formateurs`, `/api/formations`, `/api/forum`, `/api/message-templates`, `/api/notifications`, `/api/parametres`, `/api/pdf/template-preview`, `/api/projets`, `/api/signature-requests`, `/api/sessions`, `/api/tags`, `/api/utilisateurs`

### Préfixes par portail
`/api/client/*` (rôle client+admin), `/api/formateur/*` (rôle formateur+admin)

### Routes publiques
`/api/auth/*` (NextAuth), `/api/cron/*` (Bearer), `/api/evaluations/public`, `/api/inscription-publique`, `/api/besoin-client/public`, `/api/besoin-stagiaire/public`, `/api/emargement/public`, `/api/campaigns/unsubscribe`, `/api/qualite/public/*`, `/api/email-tracking/webhook`, `/api/sign/*`, `/api/signature-requests/verify`, `/api/catalogue`, `/api/badges/verify`

---

## 7. Sécurité

### Authentification
- **NextAuth v4** Credentials provider
- Mots de passe **bcryptjs** (hash + salt)
- Sessions **JWT** (compatibles middleware edge)
- Champ `actif: Boolean` sur `User` permet la désactivation immédiate

### Autorisation (RBAC)
Implémentée dans [middleware.ts](../middleware.ts) :

| Type de route | Règle |
|---------------|-------|
| Page admin (liste hardcodée `adminPages`) | `role === "admin"`, sinon redirect portail correspondant |
| Page `/espace-formateur/*` | `role ∈ {formateur, admin}` |
| Page `/espace-client/*` | `role ∈ {client, admin}` |
| API `adminApiPrefixes` | `role === "admin"`, sinon 403 |
| API `/api/client/*` | `role ∈ {client, admin}` |
| API `/api/formateur/*` | `role ∈ {formateur, admin}` |
| API `/api/cron/*` | Public au niveau middleware — handlers vérifient Bearer `CRON_SECRET` |
| Pages publiques tokenisées | Public — handlers vérifient le token |

Quelques routes ont leur autorisation portée par le handler plutôt que par le middleware (`/api/upload`, `/api/notes-frais`) pour permettre des accès mixtes formateur/admin avec contraintes spécifiques (un formateur ne peut accéder qu'à ses propres données via `session.user.formateurId`).

### Tokens publics (sans compte)
- **HMAC** pour signature électronique (rotation via `SECRET_HMAC_TOKENS_OLD`, expiration `SIGNATURE_TOKEN_EXPIRY_DAYS = 30`)
- Tokens persistés en base pour évaluations, émargement, besoins, badges, partages qualiopi
- Modèle `SignatureTokenAttempt` enregistre toutes les tentatives (audit + détection brute force)

### Cron auth
- GitHub Actions Scheduled envoie `Authorization: Bearer ${CRON_SECRET}`
- Le secret est stocké en GitHub Repository Secret
- Handlers `/api/cron/*` vérifient le header avant d'exécuter

### Rate limiting
- **Upstash Redis** + `@upstash/ratelimit` (sliding window)
- Configurations regroupées dans `lib/rate-limit-presets.ts`
- Wrapper `lib/with-rate-limit.ts` pour ajout simple sur handlers sensibles
- Sans `UPSTASH_REDIS_REST_URL`, dégrade en in-memory (inefficace en serverless multi-instances) — vérifier la présence en prod

### Sanitization
- HTML utilisateur (TipTap, messages, descriptions) : **isomorphic-dompurify** côté serveur et client
- Validation entrées : **Zod** schemas systématiques (centralisés dans `lib/validations/`)

### IA — anti-abus
- `lib/ai-guard.ts` : quotas / vérifications avant appel Anthropic
- Routes IA réservées admin

### Headers & hardening
- `X-Robots-Tag: noindex, nofollow` sur `/sign/*` (cf. middleware)
- HTTPS obligatoire (Netlify, default)
- Pas d'indexation moteurs des pages publiques sensibles

---

## 8. Performance & scalabilité

### Stratégie de scaling
- **Horizontal automatique** via Netlify Functions (scale to zero, scale-out à la demande)
- DB : Supabase pgbouncer (`?pgbouncer=true` dans `DATABASE_URL`) pour mutualisation connexions ; `DIRECT_URL` réservée aux migrations Prisma
- Pas de session sticky requise (JWT)

### Caching
- **CDN Netlify** pour assets statiques et pages SSG
- **SWR** côté client (revalidate-on-focus, stale-while-revalidate)
- Pas de cache applicatif Redis pour les données (Upstash sert uniquement au rate-limit) — opportunité d'évolution si besoin

### Optimisations
- Server Components Next.js → réduction du JS client
- `included_files = ["node_modules/pdfmake/**"]` dans `netlify.toml` pour éviter cold start déficient
- `prisma generate` en `postinstall` (pas au build → -30-60 s par déploiement)
- `NEXT_TELEMETRY_DISABLED` et `PRISMA_HIDE_UPDATE_MESSAGE` au build (gain mineur)

### Cibles (NFR-001)
- API `< 500 ms p95` sur routes principales (mesurable via Sentry Performance)
- Génération PDF `< 5 s` (devis, facture, attestation)

---

## 9. Fiabilité & monitoring

### Disponibilité (NFR-002)
- **Cible** : 99 % heures ouvrées (L-V 8h-19h CET)
- **Multi-AZ implicite** via Netlify + Supabase managés
- Pas d'astreinte ; détection par Sentry

### Sauvegardes (NFR-002)
- Supabase : sauvegardes automatiques quotidiennes (rétention selon plan)
- Vérification trimestrielle recommandée

### Monitoring
- **Sentry** : erreurs + performance, client + server + edge (DSN via env)
- **LogEmail** + **EmailTrackingEvent** : traçabilité envois transactionnels et marketing
- **HistoriqueAction** : audit applicatif (qui a modifié quoi, quand)
- **SignatureEvent** + **SignatureTokenAttempt** : audit fin signature électronique
- `lib/logger.ts` : façade logs

### Crons (résilience)
- GitHub Actions : retry 2× avec délai 30 s sur curl (cf. `cron.yml`)
- Cron `signature-retry-finalization` toutes les 5 min : reprend les requêtes bloquées en état "signed" non finalisées
- Cron `signature-expirations` : marque les requêtes expirées et purge les `SignatureTokenAttempt` anciens

---

## 10. Déploiement

### Environnements
- **Production** : https://projetrfc.netlify.app (Netlify)
- **Local** : `npm run dev` (Next dev sur :3000)
- **Pas d'environnement staging dédié documenté** → opportunité d'évolution

### Pipeline
- **CI/CD** : Netlify déclenché sur push GitHub
- **Build** : `npm run build` (Next.js + Prisma generate via postinstall)
- **Migrations** : `prisma db push` **manuel en local avant commit** (commentaire `netlify.toml`). À terme : passer à `prisma migrate deploy` pour migrations versionnées en CI (PR séparée prévue).
- **Tests** : `npm test` (Vitest) — exécutés automatiquement en CI via [.github/workflows/test.yml](../.github/workflows/test.yml) sur chaque PR/push main

### Configuration
- Variables env (cf. `.env.example`) :
  - DB : `DATABASE_URL`, `DIRECT_URL`
  - Auth : `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
  - Supabase Storage : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - Emails : `SMTP_*`
  - Rate limit : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Monitoring : `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
  - Signature : `SECRET_HMAC_TOKENS`, `SIGNATURE_TOKEN_EXPIRY_DAYS`, `FREETSA_URL`, `FREETSA_CERT_URL`, `SIGNATURE_MAX_FILE_SIZE_MB`, `SIGNATURE_MAX_PAGES`
  - Cron : `CRON_SECRET` (en GitHub Secrets aussi)
  - IA : `ANTHROPIC_API_KEY` (implicite via SDK)

### Stratégie de déploiement
- **Rolling** (Netlify atomic deploys) : un nouveau déploiement remplace l'ancien sans downtime
- Rollback en 1 clic depuis l'UI Netlify

---

## 11. Couverture des NFRs

| NFR | Solution architecturale | Validation |
|-----|------------------------|------------|
| **NFR-001 Performance** (API < 500 ms p95) | Netlify Edge + Supabase pgbouncer + Server Components, pas de SSR lourd, SWR client | Sentry Performance, mesure p95 par route |
| **NFR-002 Disponibilité** (99 % HO) | Netlify + Supabase managés, sauvegardes quotidiennes, retry crons | Sentry health, uptime monitoring (à mettre en place si pas déjà) |
| **NFR-003 Sécurité Auth/Authz** | NextAuth JWT + middleware RBAC + tokens HMAC/UUID + Bearer crons + bcrypt + rate-limit Upstash | Tests middleware + audit `SignatureTokenAttempt` |
| **NFR-004 RGPD** | Supabase EU + modèle `DemandeRgpd` + page publique `/rgpd/demande` + `MarketingOptOut` + `optOutMarketing` sur Contact | Procédure manuelle + revue trimestrielle |
| **NFR-005 Qualiopi** | Modèles dédiés (`ActionQualite`, `IncidentQualite`, `PartageQualiopi`), Supabase Storage pour preuves, `HistoriqueAction` pour traçabilité, génération PDF avec signatures | Pré-audit interne — à formaliser dans une checklist applicative |
| **NFR-006 Compat navigateurs** | Tailwind + composants standards, pas d'API browser exotique, viewport responsive tablette | Tests manuels sur Chrome/Edge/Safari/Firefox récents |
| **NFR-007 Maintenabilité** | TypeScript strict, Prisma + Zod, structure App Router conventionnelle, tests Vitest | `tsc --noEmit`, `eslint`, coverage Vitest |

---

## 12. Traçabilité FR → Composants

| FR | Composants impliqués |
|----|----------------------|
| FR-001 Entreprises & contacts | C1 |
| FR-002 Catalogue formations | C2 |
| FR-003 Sessions + inscriptions | C2 (+ C9 pour émargement) |
| FR-004 Besoins formations | C6 |
| FR-005 Devis | C6 |
| FR-006 Factures | C6 |
| FR-007 Tunnel CA | C6 |
| FR-008 Documents PDF | C7 (+ C18 templates) |
| FR-009 Évaluations à chaud / à froid | C8 + crons GitHub Actions |
| FR-010 Qualiopi | C10 |
| FR-011 BPF | C11 (+ C2, C6) |
| FR-012 Portail formateur | C4 (+ C3 pour données) |
| FR-013 Portail client | C5 (+ C1, C6 pour données) |
| FR-014 Comptes utilisateurs | C20 (`User`, NextAuth, middleware) |
| FR-015 Paramètres + notifications | C20 (`Parametres`, `Notification`) |

---

## 13. Écart périmètre PRD ↔ code (finding)

Le code en production **dépasse significativement** le périmètre v1 décrit dans [PRD.md](../PRD.md) (avril 2026) et dans le [PRD BMAD](prd-rfc-formations-2026-05-16.md) qui en a hérité.

**Composants présents en prod, absents/sous-représentés dans le PRD** :

| Composant | Status PRD initial | Réalité code |
|-----------|--------------------|--------------|
| **C12 Signature électronique** | "Roadmap haute priorité" (PRD.md §8) | Livré : HMAC + FreeTSA + audit + 3 crons dédiés + spec dédiée |
| **C9 Émargement numérique (QR)** | "Roadmap moyenne priorité (mobile)" | Livré : route publique `/emargement/[token]`, tokens, génération QR |
| **C13 Marketing & campagnes** | Non mentionné | Modèles complets, opt-out RGPD, tracking emails |
| **C14 Badges digitaux** | Non mentionné | Modèles + page publique de vérification |
| **C15 Forum & messagerie interne** | Non mentionné | ForumTopic/Reply + DM + Conversations |
| **C16 IA (Anthropic Claude)** | Non mentionné | Analyse documents, route admin protégée, ai-guard |
| **C17 Automations v2** | Non mentionné (sauf cron éval à froid) | 2 systèmes (v1 + v2), exécutions tracées, cron 15 min |
| **C18 Templates & champs personnalisés** | Mention partielle (PDFs) | Système complet : doc templates, message templates, SMS, champs perso |
| **C19 Tâches & projets** | Non mentionné | Modèles complets, lien projets ↔ entreprises ↔ formateurs |
| **NoteFrais (formateur)** | Non mentionné | Modèle + flow d'autorisation dédié |
| **ClasseVirtuelle** | Non mentionné | Modèle dédié |
| **CompetenceReferentiel + FormateurCompetence** | Non mentionné | Référentiel + mapping formateurs |
| **Parcours multi-modules** | Non mentionné | `Parcours`, `ParcoursModule`, `SessionParcours` |
| **Prospects + activité** | Non mentionné explicitement | `Prospect`, `ProspectActivity` |
| **Financements / paiements détaillés** | Mention partielle | `Financement`, `Paiement`, `EcheancierPaiement`, `TransactionBancaire`, `FactureFormateur` |
| **Pappers (enrichissement SIRET)** | Non mentionné | Route `/api/pappers` |
| **RGPD formalisé** | Non mentionné | `DemandeRgpd` + page publique `/rgpd/demande` |
| **API keys externes** | Non mentionné | Modèle `ApiKey` |
| **Rate limiting Upstash** | Non documenté en NFR | En place avec présets |

**Stack additionnelle** non mentionnée dans PRD.md §5 : Anthropic SDK, Upstash Redis, Sentry, pdf-lib, React Email, TipTap, qrcode, isomorphic-dompurify, `@supabase/supabase-js` (Storage).

**Recommandation** : si l'objectif est de garder la documentation produit en phase avec le code (utile pour onboarding, audit Qualiopi, transfert de connaissance), prévoir une mise à jour du PRD BMAD pour intégrer C12-C19 comme FRs complémentaires (FR-016+). À défaut, considérer la documentation v1 comme une description du **socle initial**, et ce document d'architecture comme la **source de vérité** sur la prod.

---

## 14. Trade-offs

### Monolithe modulaire vs. microservices
- **Choix** : monolithe modulaire
- **✓ Gain** : un seul déploiement, debug simple, opérable par 1 développeur, partage du modèle Prisma sans duplication, transactions ACID natives
- **✗ Perte** : impossible de scaler indépendamment les modules (mais charge actuelle ne le justifie pas), déploiement = redémarrage de tout
- **Rationale** : taille équipe et charge cible ne justifient pas la complexité microservices

### Prisma vs. supabase-js full
- **Choix** : Prisma pour la DB, supabase-js uniquement pour Storage
- **✓ Gain** : ORM typé, migrations versionnées, écosystème mature ; pas de double client
- **✗ Perte** : ne profite pas des Row Level Security Supabase (toute l'auth est applicative via middleware)
- **Rationale** : RLS Supabase complexifie le développement quand on a déjà NextAuth + middleware ; cohérence du modèle de sécurité préférée

### Crons GitHub Actions vs. Netlify Scheduled Functions
- **Choix** : GitHub Actions Scheduled
- **✓ Gain** : envoi du Bearer `CRON_SECRET` possible (auth crons sécurisée) ; logs et historique d'exécutions visibles dans GitHub
- **✗ Perte** : latence "best-effort" 5-15 min (acceptable pour cron 15 min mais pas pour un cron strict)
- **Rationale** : sécurité prime sur précision temporelle ; `signature-retry-finalization` (5 min) reste opérable malgré la latence

### Signature électronique self-hosted vs. SaaS (DocuSign, Yousign…)
- **Choix** : implémentation custom HMAC + FreeTSA
- **✓ Gain** : pas de coût récurrent SaaS, intégration native, pas de dépendance commerciale
- **✗ Perte** : valeur juridique potentiellement moins reconnue qu'une signature qualifiée eIDAS ; charge de maintenance interne
- **Rationale** : usage interne formation (conventions, devis) ; valeur probante FreeTSA suffit pour les cas RFC ; à réévaluer si besoin de signatures qualifiées

### NextAuth JWT vs. session DB
- **Choix** : JWT
- **✓ Gain** : compatibilité middleware edge (vérification sans round-trip DB), scalabilité serverless
- **✗ Perte** : impossible de révoquer une session côté serveur sans changer `NEXTAUTH_SECRET` (rotation globale) ; le champ `actif: false` sur `User` n'invalide les sessions existantes qu'au prochain refresh
- **Rationale** : la simplicité serverless prime ; la rotation `NEXTAUTH_SECRET` reste un levier d'urgence ; durée de session courte recommandée si pas déjà configurée

---

## 15. Questions ouvertes & dette technique identifiée

1. **Migrations Prisma** : actuellement `prisma db push` manuel local (commentaire `netlify.toml`). PR prévue pour passer à `prisma migrate deploy` (migrations versionnées en CI).
2. **Environnement staging** : non documenté. Préprod sur branche dédiée ou Netlify Deploy Preview ?
3. **Tests CI** : Vitest installé, à vérifier si exécuté en CI sur chaque PR.
4. **Rate-limit fallback** : sans Upstash, dégradation in-memory inefficace en serverless. Alerter si `UPSTASH_*` non défini en prod.
5. **Cache applicatif Redis** : Upstash sert uniquement au rate-limit. Opportunité d'évolution si points chauds identifiés (KPI dashboard, calculs BPF).
6. ~~**Numéro Sécurité Sociale stocké en clair** sur `Contact`~~ — **résolu par STORY-TD-001** (chiffrement AES-256-GCM via [lib/encryption.ts](../lib/encryption.ts), préfixe `enc::v1::`). Procédure de migration des données existantes : [docs/operations/migration-nss.md](operations/migration-nss.md).
7. **JWT révocation** : pas de mécanisme de blacklist ; en cas de compte compromis, rotation `NEXTAUTH_SECRET` requise (impact tous utilisateurs).
8. **PRD vs code** : décision à prendre sur la stratégie de re-synchronisation (cf. §13).
9. **Backups Supabase** : fréquence à vérifier selon plan ; tester un restore réel pour valider la procédure DR.
10. **Documentation utilisateur** : non couverte par ce document — séparée probablement.

---

*Document généré par le workflow `/bmad:architecture` le 2026-05-16, à partir d'une inspection directe du code en production (`package.json`, `prisma/schema.prisma` — 88 modèles, `middleware.ts`, `netlify.toml`, `.github/workflows/cron.yml`, `.env.example`, structure `app/` et `lib/`) et des documents amont [PRD](prd-rfc-formations-2026-05-16.md) et [Product Brief](product-brief-rfc-formations-2026-05-16.md).*
