# Signature électronique self-hosted — Design

**Date :** 2026-05-12
**Auteur :** Brainstormé avec Ismael Lepennec (RFC — Rescue Formation Conseil)
**Statut :** Validé pour planification

---

## Contexte

RFC est une plateforme TMS pour organisme de formation Qualiopi (Next.js 14 + NextAuth + Prisma + Supabase + Netlify), en migration depuis Digiforma. Digiforma incluait une signature électronique en marque blanche (probablement Yousign), facturée dans l'abonnement. L'objectif est de reconstruire cette capacité dans RFC, **100 % self-hosted, sans API payante, sans coût par signature**.

Le système existant dans RFC est minimaliste :
- Canvas signature sur les devis (`app/espace-client/devis/page.tsx`)
- Modèle Prisma `SignatureDocument` (signatureBase64 + IP + UA, sans audit chaîné ni hash document)
- Génération PDF via `lib/pdf/*` (devis, convention, attestation, etc.)
- Storage Supabase configuré (`lib/supabase.ts`)
- Email via nodemailer (`lib/email.ts`)
- Aucune librairie PDF installée à ce jour (pas de `pdf-lib`, `pdfjs`...)

## Objectif

Système complet de signature électronique de type Yousign/LexPersona, intégré dans RFC, couvrant :
- Upload PDF
- Placement visuel libre des zones de signature
- Capture signature canvas / texte stylisé / image uploadée
- Hash SHA-256 du document
- Horodatage RFC 3161 via TSA gratuit
- Audit log chaîné par hash
- Multi-signataires (V3)
- Génération PDF final signé + certificat de preuve séparé
- Verrouillage post-signature
- Workflow d'invitation par email avec lien magique

## Niveau juridique visé

**Signature électronique simple renforcée** au sens eIDAS :
- Identité : lien magique email à usage unique + token HMAC
- Consentement : canvas / texte / image + checkbox CGV explicite
- Intégrité : SHA-256 + horodatage RFC 3161 (FreeTSA gratuit, certifié RFC 3161 mais non qualifié eIDAS)
- Traçabilité : audit log chaîné par hash + IP + User-Agent + fingerprint

**Limitations assumées et documentées** :
- N'est **pas** une signature "avancée" eIDAS au sens strict (pas de PSCo certifié)
- N'est **pas** équivalente à une signature manuscrite (pas le niveau "qualifié")
- Largement suffisant pour Qualiopi et 95 % des usages B2B (devis < 50 k€, conventions formation, attestations)
- Pour litiges contestés à fort enjeu, prévoir intégration Yousign en option (non couvert par cette spec)

## Périmètre V1

- **Mono-signataire** (multi en V3, modèle déjà prêt pour absorber sans migration de données)
- **Placement visuel libre** des zones (drag-drop sur PDF rendu, indépendant des templates RFC existants)
- **Signataires libres par email** (création à la volée, rattachement auto si email matche un `Contact` existant)
- **Rétention à vie** sur Supabase Storage (RGPD : obligation légale prévaut)
- **Module greffe** côté à côté de l'existant (le `SignatureDocument` legacy continue à servir les devis actuels jusqu'à migration en V2)
- **Stack 100 % Node/Next.js**, déployable directement sur Netlify (pas de container sidecar)

Hors périmètre V1 (reportés) :
- Multi-signataires + workflow séquentiel/parallèle (V3)
- Signature PAdES cryptographique embarquée dans le PDF (V4)
- Vérification SMS/OTP (V4)
- Migration des flux existants devis/convention/attestation (V2)
- Ancrage externe du hash (V4)

## Architecture

### Découpage en 5 modules isolés

| Module | Responsabilité | Dépendances |
|---|---|---|
| `pdf-viewer` | Rendu visuel du PDF page par page | `pdfjs-dist` |
| `designer` | Placement / redimensionnement des zones | `pdf-viewer` |
| `workflow` | États du document, génération tokens, envoi email | Prisma, `lib/email.ts` |
| `signer` | Vue publique signataire, capture signature | `pdf-viewer` |
| `proof` | Hash, horodatage TSA, audit log, PDF final + certificat | `pdf-lib`, `node:crypto` |

Chaque module testable indépendamment. Upgrade vers PAdES en V4 = modification dans `proof` uniquement.

### Arborescence cible

```
app/
  signatures/                          ← module admin
    page.tsx                           ← liste documents en signature
    nouveau/page.tsx                   ← upload + placement
    [id]/page.tsx                      ← suivi statut + audit log
  sign/                                ← module public (signataire)
    [token]/page.tsx                   ← lien magique → vue signataire
    [token]/success/page.tsx           ← confirmation
  api/
    signatures/
      route.ts                         ← POST / GET
      [id]/route.ts                    ← GET / PATCH / DELETE
      [id]/send/route.ts               ← POST envoie
      [id]/audit/route.ts              ← GET audit log
      [id]/certificate/route.ts        ← GET certificat
      [id]/verify-audit/route.ts       ← GET vérification chaîne
      verify/route.ts                  ← POST vérification publique
    sign/
      [token]/submit/route.ts          ← POST capture signature
      [token]/decline/route.ts         ← POST refus

components/signatures/
  PdfViewer.tsx
  SignatureZoneDesigner.tsx
  SignaturePad.tsx
  SignatureMethodTabs.tsx              ← onglets canvas / texte / image
  ZoneFiller.tsx                       ← modal de remplissage par zone
  AuditLogViewer.tsx

lib/signatures/
  pdf-renderer.ts                      ← wrapper PDF.js
  pdf-stamper.ts                       ← injection signatures via pdf-lib
  hash.ts                              ← SHA-256
  audit-chain.ts                       ← chaîne hashée
  tsa.ts                               ← FreeTSA RFC 3161
  certificate-generator.ts             ← PDF certificat
  workflow.ts                          ← machine à états
  token.ts                             ← HMAC tokens magiques
```

### Librairies (toutes MIT/Apache 2.0, gratuites)

| Lib | Rôle | Justification |
|---|---|---|
| `pdfjs-dist` | Rendu PDF côté client | Standard Mozilla, fonctionne navigateur + Node, 50k★ |
| `pdf-lib` | Modification PDF côté serveur | MIT, pas de dépendance native, compatible Netlify Functions |
| `react-signature-canvas` | Pad canvas | Mature, ~280k DL/sem |
| `@react-pdf/renderer` | Génération PDF certificat | Cohérent écosystème React |
| `node:crypto` | SHA-256, HMAC | Natif Node, zéro dépendance |
| `qrcode` | QR code sur certificat | Léger, MIT |

**Alternatives écartées** :
- `react-pdf` : moins de contrôle pour le designer
- `hummus-recipe`, `muhammara` : compilation native, casse sur Netlify Functions
- `pdfkit` : génération uniquement, pas modification de PDF existant

## Modèle de données

Cinq nouveaux modèles Prisma. Le `SignatureDocument` existant n'est **pas** touché — il reste opérationnel pour les devis actuels jusqu'à migration V2.

### `SignatureRequest`

Représente une demande de signature (= un document à faire signer).

Champs clés :
- Identité : `id`, `titre`, `description`, `type` (custom | devis | convention | attestation | nda | autre)
- Rattachement RFC optionnel : `devisId`, `sessionId`, `contactId`, `entrepriseId`
- Fichier original : `originalFileUrl`, `originalFileSha256`, `originalFileSize`, `originalPageCount`
- Fichier signé : `signedFileUrl`, `signedFileSha256`
- Workflow : `statut` (draft | ready | sent | viewed | signed | completed | expired | cancelled | rejected), timestamps `expiresAt`, `sentAt`, `viewedAt`, `signedAt`, `completedAt`
- Preuves : `tsaTimestamp`, `tsaTimestampedAt`, `certificateUrl`, `lastEventHash`
- Audit créateur : `createdByUserId`

Relations : 1-N `zones`, 1-1 `signataire` (V1, retirera `@unique` en V3), 1-N `events`.

Index : `statut`, `createdAt`, `devisId`, `sessionId`, `entrepriseId`.

### `SignatureZone`

Zone placée visuellement sur le PDF.

- `requestId`, `page` (1-indexed)
- Coordonnées en **unités PDF (points, 72 dpi)** — pas en pixels. Le viewer convertit pixels↔points à l'affichage.
- `x`, `y`, `width`, `height` en `Float`
- `type` : signature | initials | date | text
- `label`, `required`
- Rempli : `filled`, `filledValue` (base64 image ou texte), `filledMethod` (canvas | text | image), `filledAt`

### `Signataire`

- `requestId` (`@unique` en V1, retiré en V3)
- Identité : `email`, `nom`, `contactId` (rattachement auto si match)
- Token : `tokenHash` (stocké hashé SHA-256, jamais en clair), `tokenSentAt`
- Statut individuel : `pending | viewed | signed | declined | expired`
- Timestamps : `viewedAt`, `signedAt`, `declinedAt`
- Refus : `declineReason`
- Preuves signature : `signatureIp`, `signatureUserAgent`, `signatureFingerprint` (hash IP+UA+résolution+timezone)

### `SignatureEvent`

Audit log chaîné par hash, immutable.

- `requestId`, `type` (created | zones_placed | sent | email_opened | viewed | signature_started | signed | tsa_stamped | completed | expired | cancelled | rejected | downloaded)
- Acteur : `actorType` (admin | signataire | system), `actorId`
- `payload` (Json, libre)
- **Chaîne** : `previousEventHash` (hash event précédent, null pour 1er), `eventHash = SHA256({type, actorType, actorId, payload, createdAt, previousEventHash})`

Tête de chaîne stockée dans `SignatureRequest.lastEventHash` pour vérification rapide.

### `SignatureTokenAttempt`

Rate-limit anti-bruteforce.

- `tokenPrefix` (8 premiers chars), `ip`, `success`
- Index `(tokenPrefix, createdAt)` et `(ip, createdAt)`
- Auto-purge > 30 jours

### Décisions de modélisation

| Décision | Raison |
|---|---|
| Nouveau modèle séparé de `SignatureDocument` legacy | Migration progressive sans casse |
| `Signataire` table dédiée même en mono-V1 | Passage à multi-signataire en V3 = retrait `@unique`, zéro migration de données |
| Token stocké hashé en BD | Fuite BD ⇒ tokens inexploitables |
| Coordonnées en points PDF | Indépendant de l'écran, universel pour pdf-lib |
| Audit chaîné par hash plutôt que append-only simple | Détection de modification rétroactive |
| Pas de modèle `EmailTracking` dédié | RFC a déjà `app/api/email-tracking/`, on s'y branche |

## Flux de signature

### Phase 1 — Admin (création)

| Action | Backend | Audit event |
|---|---|---|
| Drag-drop PDF sur `/signatures/nouveau` | `POST /api/signatures` : crée `SignatureRequest` `draft`, upload Supabase, calcule `originalFileSha256` | `created` |
| Rendu PDF via `pdfjs-dist` page par page sur `<canvas>` | — | — |
| Placement zones (drag-drop sur overlay React) | `PATCH /api/signatures/[id]` debounced 500 ms | — |
| Saisie signataire email + nom (autocomplete `Contact`) | Pré-remplit `contactId` si match | — |
| Clic "Envoyer pour signature" | `POST /api/signatures/[id]/send` : statut `ready` → `sent`, génère token, envoie email | `zones_placed`, `sent` |

### Phase 2 — Token & envoi email

```
rawToken = cuid() + cuid()                 // 50 chars random
signature = hmacSha256(rawToken, SECRET)   // 64 chars
fullToken = rawToken + "." + signature     // 115 chars

email contient : https://projetrfc.netlify.app/sign/{fullToken}
BD stocke : tokenHash = sha256(fullToken)
```

Email envoyé via `lib/email.ts` existant + template React Email. Tracking pixel pour `email_opened`.

### Phase 3 — Signataire (vue publique)

| Action | Backend | Audit event |
|---|---|---|
| Clic lien dans email | `GET /sign/[token]` valide HMAC, vérifie expiration, log IP/UA | `viewed` (1ère fois) |
| Affichage PDF + zones surlignées | — | — |
| Clic zone "Signature" → modal 3 onglets (Dessiner / Taper / Importer image) | — | `signature_started` |
| Remplissage des zones | — | — |
| Checkbox CGV + bouton "Confirmer ma signature" | — | — |
| Confirmation → `POST /sign/[token]/submit` | Voir Phase 4 | `signed` |

Sécurités page publique : rate-limit IP, `X-Robots-Tag: noindex`, CSP strict, pas de JS externe.

### Phase 4 — Finalisation (5 étapes atomiques)

1. Reconstruction PDF final via `pdf-lib` (embed images/textes dans zones)
2. Hash : `signedFileSha256 = sha256(buffer)`
3. Horodatage : POST FreeTSA avec TSQ → reçoit token TSR signé → stocké `tsaTimestamp`
4. Génération certificat de preuve (PDF séparé) via `@react-pdf/renderer` : titre doc, signataire (nom/email/IP/UA), date, hashes, horodatage TSA, audit log, QR vers `/verify`
5. Append `SignatureEvent` type `completed`, update `SignatureRequest.statut = "completed"`

Transaction Prisma. Idempotent. Si crash : statut reste `signed`, job retry asynchrone toutes les 5 min (max 3 tentatives), alerte admin si échec définitif.

**Implémentation des jobs (retry + expirations + rappels)** : via **GitHub Actions Scheduled** (`.github/workflows/cron.yml`), conformément à l'architecture cron existante de RFC (migration depuis Netlify `[[crons]]` réalisée en mai 2026 pour permettre l'auth `CRON_SECRET` en Bearer header — voir commit `d14d449`).

Ajout de trois schedules au workflow existant, chacun appelant un endpoint sécurisé par `Authorization: Bearer ${CRON_SECRET}` :
- `*/5 * * * *` → `POST /api/cron/signature-retry-finalization` — reprend les requests bloquées en `signed` non `completed`
- `0 2 * * *` (quotidien 2h UTC) → `POST /api/cron/signature-expirations` — marque `expired` + purge `SignatureTokenAttempt` > 30j
- `0 9 * * *` (quotidien 9h UTC) → `POST /api/cron/signature-reminders` — rappels J-3 et J-1

Latence GitHub Actions Scheduled : best-effort, drift 5-15 min (jusqu'à 30 min pour `*/5min`). Acceptable pour ce cas d'usage (la finalisation peut attendre ; les expirations et rappels sont quotidiens).

Alternative écartée : `pg_cron` Supabase (logique applicative en JS plus simple à maintenir, et on respecte l'architecture cron déjà choisie pour RFC).

### Phase 5 — Distribution

- Email confirmation signataire : PDF signé + certificat en pièce jointe + lien permanent
- Email notif admin : "Document signé par X"
- Espace client RFC : apparition auto dans `/espace-client/documents` si `entrepriseId` renseigné
- Page `/verify` publique : upload PDF + vérification hash + audit chain + horodatage

### Cas d'erreur

| Cas | Comportement |
|---|---|
| Token invalide / expiré | Page "Lien expiré" + bouton "Demander nouveau lien" (email admin) |
| Document déjà signé | Page "Déjà signé" + lien vers PDF final |
| Crash Phase 4 | Retry async × 3, alerte admin si échec définitif |
| FreeTSA injoignable | Retry × 3 backoff exponentiel. Si échec : signature acceptée avec `tsaTimestamp = null` + flag `requiresTimestamp`. Job nocturne complète. |
| Signataire refuse | `POST /sign/[token]/decline` avec `declineReason`. Statut `rejected`. |
| Expiration | Job cron quotidien. Rappels J-3 et J-1 par email. |

## Sécurité

### Modèle de menace et mitigations

| Menace | Mitigation |
|---|---|
| Fabrication de token | HMAC SHA-256 avec secret serveur (`SECRET_HMAC_TOKENS` env Netlify). Vérification HMAC avant DB lookup pour éviter DoS Postgres. |
| Rejeu de token | Usage unique côté écriture (`POST submit` rejeté si statut ≠ `viewed`). Token hashé en BD. |
| Modification PDF post-signature | SHA-256 stocké + horodatage RFC 3161 FreeTSA. Toute modification détectable. |
| Modification audit log rétroactive | Chaîne hashée : modifier un event casse tous les `previousEventHash` suivants. |
| Spoofing IP/UA signataire | Faisceau d'indices (email + IP + UA + fingerprint + tracking email). Suffisant en justice civile. |
| Phishing du lien | Mitigations email standard (DKIM/SPF/DMARC à configurer sur le domaine). Hors scope code. |
| Énumération tokens | Espace 2^256, infaisable. Rate-limit en complément. |
| Stockage non chiffré | Supabase chiffre BD + Storage au repos (AES-256). Bucket privé, signed URL TTL 5 min. |
| XSS via PDF malveillant | Validation magic bytes `%PDF-`. Rejet des PDF avec `/JS`, `/JavaScript`, `/OpenAction`. Pas de rendu exécutif côté serveur. |
| Upload massif | Taille max 25 Mo, max 50 pages. |

### Rate-limiting

- 10 GET `/sign/[token]` / min / IP
- 3 POST `/sign/[token]/submit` / min / IP
- 100 GET / jour / IP
- Logué dans `SignatureTokenAttempt`

### RGPD

| Donnée | Base légale | Durée |
|---|---|---|
| Email, nom signataire | Exécution contractuelle | 10 ans (obligation comptable + Qualiopi) |
| IP, UA, fingerprint | Intérêt légitime (preuve) | 10 ans |
| Signature image | Exécution contractuelle | 10 ans |

Route DSAR : `/api/signatures/export-personal-data?email=X`. Effacement non applicable (obligation légale prévaut).

### Routes

Toutes les routes `/api/signatures/*` sauf `/sign/*` et `/verify` exigent `role = admin`. Middleware existant étendu pour le préfixe. CSRF via NextAuth.

### Comparaison avec Yousign / Digiforma

| Aspect | RFC self-hosted | Yousign / Digiforma |
|---|---|---|
| Identité signataire | Email + IP + UA + fingerprint | + SMS OTP optionnel |
| Intégrité doc | SHA-256 + TSA gratuit | SHA-256 + TSA qualifié |
| Signature PDF cryptographique | Non (V1) / optionnel V4 | Oui (PAdES B-LT) |
| Audit log opposable | Oui (chaîne hashée interne) | Oui (+ ancrage externe) |
| Tampon "PSCo certifié" | Non | Oui |
| Coût / signature | **0 €** | 1 à 3 € |
| Défendabilité justice civile | Suffisante pour 95 % cas B2B | Maximale |

## Tests

### Pyramide

| Niveau | Outil | Nombre approximatif |
|---|---|---|
| Unitaires | Vitest | 40+ (lib/signatures/*) |
| Intégration | Vitest + DB de test | 20 (API routes) |
| E2E | Playwright | 8 scénarios |

### Tests unitaires clés

- `hash.ts` : SHA-256 buffer, stabilité, perf < 100 ms pour 10 Mo
- `token.ts` : génération, HMAC, vérification, format invalide, expiration
- `audit-chain.ts` : chaîne valide, détection event modifié, supprimé, injecté
- `pdf-stamper.ts` : injection 1 zone, multi-zones, multi-pages, signature image/texte, PDF résultat valide
- `tsa.ts` : call FreeTSA mocké, parse, timeout, retry backoff
- `workflow.ts` : machine à états (transitions valides/invalides)
- `certificate-generator.ts` : génération avec données factices

### Tests d'intégration

`POST /api/signatures` création, `PATCH` zones (refuse si statut ≠ draft), `POST send` (token + email + audit), `GET /sign/[token]` (valide/invalide/expiré/déjà signé), `POST submit` (signature + chain + idempotence), `POST decline`, `GET verify`, rate-limit, RBAC, concurrence sur même token.

### Tests E2E Playwright

1. **Golden path admin** : login → upload → place zones → saisie → envoi (~30 s)
2. **Golden path signataire** : email (capturé via Mailpit, serveur SMTP de test local) → clic → signe canvas → confirme → confirmation (~45 s)
3. **Signature texte stylisée** : onglet "Taper" → nom + police cursive → confirme (~30 s)
4. **Signature image** : upload PNG → preview → confirme (~30 s)
5. **Token expiré** : avancer `expiresAt` BD → page expiration (~20 s)
6. **Refus** : ouvre lien → "Refuser" + motif → admin reçoit notif (~30 s)
7. **Vérification d'intégrité** : upload PDF signé sur `/verify` → hash valide + chain + horodatage (~20 s)
8. **Responsive mobile** : scénario 2 sur iPhone 13 viewport, signature au doigt (~45 s)

## Phasage de livraison V1

| Sprint | Durée | Livrable démontrable |
|---|---|---|
| 1. Fondations | 1.5 j | Migration Prisma + hash/token + bucket Supabase + skeleton routes |
| 2. pdf-viewer + designer | 2 j | Upload + placement zones sauvegardé en BD |
| 3. Envoi + vue signataire | 2 j | Admin envoie, signataire ouvre le lien et voit le PDF |
| 4. Capture signature | 1.5 j | Signataire signe (3 méthodes) et reçoit confirmation |
| 5. Finalisation cryptographique | 2 j | Parcours end-to-end complet avec PDF final + certificat + horodatage |
| 6. Suivi admin + finition | 2 j | Liste/détail admin + cron expiration + tests E2E + intégration espace client |

**Total V1 : ~11 jours de dev.**

## Roadmap post-V1

- **V2 (~5 j)** : migration des flux existants (devis, convention, attestation) vers le nouveau système. Archive `SignatureDocument` legacy.
- **V3 (~5-7 j)** : multi-signataires, workflow séquentiel/parallèle, relances individuelles.
- **V4 (~3-5 j, optionnel)** : signature PAdES via `@signpdf/signpdf` (badge Adobe Reader), vérification OTP SMS pour signatures à fort enjeu, ancrage externe du `lastEventHash`.

## Critères de "Done" V1

| Critère | Vérification |
|---|---|
| Admin upload PDF + place zones | E2E #1 vert |
| Signataire signe via 3 méthodes | E2E #2, #3, #4 verts |
| PDF final généré avec signatures embarquées | Inspection + hash vérifiable |
| Certificat de preuve PDF généré | Présent + lisible + QR vers /verify |
| Horodatage FreeTSA fonctionne | Test intégration vert + audit manuel |
| Audit chaîné détecte modifications | Test unitaire vert |
| Page `/verify` détecte PDF modifié | E2E #7 vert |
| Espace client affiche docs signés (rattachement entreprise) | Test manuel |
| Tous E2E verts | `npx playwright test` vert |
| Pas de régression sur devis existant | Tests existants verts + test manuel |
| Doc utilisateur 1 page dans `/help` | Page créée |

## Décisions explicites et non négociables

1. **Aucune API payante.** FreeTSA est gratuit, MIT/Apache-2.0 uniquement, Supabase déjà payé.
2. **Pas de sidecar Docker.** Tout doit fonctionner sur Netlify Functions tel quel.
3. **Migration progressive, pas big bang.** Le flux devis existant reste intact en V1.
4. **Signature simple renforcée** assumée. Pas d'illusion de signature "qualifiée".
5. **Audit log chaîné en BD, ancrage externe en V4.**

## Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| FreeTSA indisponible / lent | Moyen | Moyen | Retry backoff + acceptation différée + job de complétion nocturne |
| `pdfjs-dist` worker config Netlify | Moyen | Élevé (bloquant V1) | Sprint 2 = POC en premier, fallback `react-pdf` documenté |
| Conversion pixels↔points imprécise | Moyen | Moyen (zones mal placées) | Tests unitaires avec PDFs de référence + tests visuels manuels |
| Litige juridique avec signataire de mauvaise foi | Faible | Élevé | Faisceau d'indices documenté + V4 PAdES en option |
| Perte clé `SECRET_HMAC_TOKENS` | Faible | Très élevé | Backup chiffré + procédure de rotation documentée (avec `OLD_SECRET` fallback) |

## Annexe : variables d'environnement nécessaires

```
# Existantes RFC (déjà configurées)
DATABASE_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
CRON_SECRET=...                                        # Réutilisé pour les nouveaux endpoints cron

# Nouvelles
SECRET_HMAC_TOKENS=<32 bytes random base64>           # Sécurise les tokens magiques
SECRET_HMAC_TOKENS_OLD=<optionnel, pour rotation>     # Permet rotation sans casser tokens existants
SIGNATURE_TOKEN_EXPIRY_DAYS=30                        # Durée validité token par défaut
FREETSA_URL=https://freetsa.org/tsr                   # TSA RFC 3161 gratuit
FREETSA_CERT_URL=https://freetsa.org/files/tsa.crt    # Certificat public pour vérification
SIGNATURE_MAX_FILE_SIZE_MB=25
SIGNATURE_MAX_PAGES=50
```
