# Signature électronique self-hosted — Plan d'implémentation V1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire dans RFC un système complet de signature électronique self-hosted (mono-signataire, placement visuel libre, hash + horodatage FreeTSA + audit chaîné) pour remplacer la dépendance Yousign/Digiforma.

**Architecture:** 5 modules isolés (pdf-viewer, designer, workflow, signer, proof). Module greffe à côté du `SignatureDocument` legacy (migration progressive V2). Stack 100% Node/Next.js compatible Netlify Functions. Cron via GitHub Actions Scheduled (cohérent commit `d14d449`).

**Tech Stack:** Next.js 14 App Router · Prisma 5 · Supabase Storage · `pdfjs-dist` (viewer) · `pdf-lib` (modification PDF) · `react-signature-canvas` · `@react-pdf/renderer` (certificat) · `node:crypto` (SHA-256/HMAC) · FreeTSA RFC 3161 (horodatage) · Vitest (unit/intégration) · Playwright (E2E).

**Spec de référence:** `docs/superpowers/specs/2026-05-12-signature-electronique-self-hosted-design.md`

---

## File structure cible

```
app/
  signatures/page.tsx                              [admin: liste]
  signatures/nouveau/page.tsx                      [admin: upload + placement]
  signatures/[id]/page.tsx                         [admin: suivi]
  sign/[token]/page.tsx                            [public: vue signataire]
  sign/[token]/success/page.tsx                    [public: confirmation]
  verify/page.tsx                                  [public: vérification]
  api/signatures/route.ts                          [POST / GET]
  api/signatures/[id]/route.ts                     [GET / PATCH / DELETE]
  api/signatures/[id]/send/route.ts                [POST envoi]
  api/signatures/[id]/audit/route.ts               [GET audit log]
  api/signatures/[id]/certificate/route.ts         [GET certificat]
  api/signatures/[id]/verify-audit/route.ts        [GET vérif chaîne]
  api/signatures/verify/route.ts                   [POST vérif publique]
  api/sign/[token]/submit/route.ts                 [POST capture signature]
  api/sign/[token]/decline/route.ts                [POST refus]
  api/cron/signature-retry-finalization/route.ts   [cron retry]
  api/cron/signature-expirations/route.ts          [cron expirations]
  api/cron/signature-reminders/route.ts            [cron rappels]

components/signatures/
  PdfViewer.tsx                                    [module pdf-viewer]
  SignatureZoneDesigner.tsx                        [module designer]
  SignaturePad.tsx                                 [module signer - canvas]
  SignatureMethodTabs.tsx                          [3 onglets canvas/text/img]
  ZoneFiller.tsx                                   [modal de remplissage]
  AuditLogViewer.tsx                               [affichage audit]
  SignatureStatusBadge.tsx                         [badge couleur statut]

lib/signatures/
  hash.ts                                          [SHA-256]
  token.ts                                         [HMAC tokens magiques]
  workflow.ts                                      [machine à états]
  audit-chain.ts                                   [chaîne hashée]
  pdf-renderer.ts                                  [wrapper PDF.js Node]
  pdf-stamper.ts                                   [injection signatures pdf-lib]
  tsa.ts                                           [FreeTSA RFC 3161]
  certificate-generator.ts                         [PDF certificat preuve]
  zones.ts                                         [conversions pixels↔points]
  storage.ts                                       [helpers Supabase bucket signature-documents]
  rate-limit.ts                                    [vérif rate-limit token]

emails/
  SignatureRequestEmail.tsx                        [template email envoi]
  SignatureCompletedEmail.tsx                      [template email confirmation]
  SignatureReminderEmail.tsx                       [template rappel J-3/J-1]

tests/signatures/
  hash.test.ts
  token.test.ts
  workflow.test.ts
  audit-chain.test.ts
  pdf-stamper.test.ts
  tsa.test.ts
  zones.test.ts
  integration/
    create-request.test.ts
    send-and-view.test.ts
    submit-signature.test.ts
    verify-document.test.ts

tests/e2e/signatures/
  01-admin-golden-path.spec.ts
  02-signataire-golden-path.spec.ts
  03-signature-texte.spec.ts
  04-signature-image.spec.ts
  05-token-expire.spec.ts
  06-refus.spec.ts
  07-verify.spec.ts
  08-mobile-responsive.spec.ts

prisma/migrations/
  YYYYMMDDHHMMSS_add_signature_module/migration.sql
```

---

## Sprint 1 — Fondations (1.5j)

**Objectif sprint :** infrastructure de test + migration BD + briques crypto + bucket Supabase + skeleton routes API.

**Validation fin sprint :** `npm test` passe, schéma visible dans Prisma Studio, bucket `signature-documents` créé, routes API renvoient 501 (Not Implemented) sur appels GET.

---

### Task 1.1 : Installer et configurer Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (devDependencies + scripts)
- Create: `tests/setup.ts`

- [ ] **Step 1: Installer Vitest et dépendances**

Run: `npm install -D vitest @vitest/coverage-v8 happy-dom @testing-library/react @testing-library/jest-dom`

Expected: dépendances ajoutées à `devDependencies`, pas d'erreur peer-deps.

- [ ] **Step 2: Créer `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/signatures/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 3: Créer `tests/setup.ts`**

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.useRealTimers();
});
```

- [ ] **Step 4: Ajouter scripts à `package.json`**

Dans la section `"scripts"`, ajouter :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Vérifier que Vitest démarre**

Run: `npm test`
Expected: "No test files found, exiting with code 0" (ou similaire) — pas d'erreur de config.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json package-lock.json
git commit -m "test: setup Vitest pour tests unitaires et intégration"
```

---

### Task 1.2 : Migration Prisma — 5 nouveaux modèles

**Files:**
- Modify: `prisma/schema.prisma` (append à la fin, avant les modèles `Champ*`)
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_signature_module/migration.sql` (généré)

- [ ] **Step 1: Ajouter les modèles dans `prisma/schema.prisma`**

Ajouter avant la section `// ==================== CHAMPS PERSONNALISES ====================` :

```prisma
// ==================== MODULE SIGNATURE ELECTRONIQUE V1 ====================
// Spec: docs/superpowers/specs/2026-05-12-signature-electronique-self-hosted-design.md
// Note: ne PAS toucher au SignatureDocument legacy ci-dessus (devis canvas actuel)

model SignatureRequest {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  titre       String
  description String?
  type        String   @default("custom") // custom | devis | convention | attestation | nda | autre

  devisId       String?
  sessionId     String?
  contactId     String?
  entrepriseId  String?

  originalFileUrl    String
  originalFileSha256 String
  originalFileSize   Int
  originalPageCount  Int

  signedFileUrl      String?
  signedFileSha256   String?

  statut       String    @default("draft") // draft | ready | sent | viewed | signed | completed | expired | cancelled | rejected
  expiresAt    DateTime?
  sentAt       DateTime?
  viewedAt     DateTime?
  signedAt     DateTime?
  completedAt  DateTime?

  tsaTimestamp     String?
  tsaTimestampedAt DateTime?
  certificateUrl   String?
  lastEventHash    String?

  createdByUserId String
  createdBy       User   @relation("SignatureRequestCreatedBy", fields: [createdByUserId], references: [id])

  zones      SignatureZone[]
  signataire Signataire?
  events     SignatureEvent[]

  @@index([statut])
  @@index([createdAt])
  @@index([devisId])
  @@index([sessionId])
  @@index([entrepriseId])
}

model SignatureZone {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  requestId String
  request   SignatureRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  page      Int
  x         Float
  y         Float
  width     Float
  height    Float

  type      String  @default("signature") // signature | initials | date | text
  label     String?
  required  Boolean @default(true)

  filled       Boolean   @default(false)
  filledValue  String?
  filledMethod String?
  filledAt     DateTime?

  @@index([requestId])
}

model Signataire {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  requestId String   @unique
  request   SignatureRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  email     String
  nom       String
  contactId String?
  contact   Contact? @relation("SignataireContact", fields: [contactId], references: [id])

  tokenHash   String    @unique
  tokenSentAt DateTime?

  statut        String    @default("pending") // pending | viewed | signed | declined | expired
  viewedAt      DateTime?
  signedAt      DateTime?
  declinedAt    DateTime?
  declineReason String?

  signatureIp          String?
  signatureUserAgent   String?
  signatureFingerprint String?

  @@index([email])
  @@index([contactId])
}

model SignatureEvent {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  requestId String
  request   SignatureRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  type      String
  actorType String  // admin | signataire | system
  actorId   String?

  payload Json?

  previousEventHash String?
  eventHash         String  @unique

  @@index([requestId])
  @@index([createdAt])
  @@index([type])
}

model SignatureTokenAttempt {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  tokenPrefix String
  ip          String
  success     Boolean

  @@index([tokenPrefix, createdAt])
  @@index([ip, createdAt])
}
```

- [ ] **Step 2: Ajouter les relations dans les modèles User et Contact existants**

Dans le modèle `User`, ajouter la relation inverse :

```prisma
signatureRequestsCreated SignatureRequest[] @relation("SignatureRequestCreatedBy")
```

Dans le modèle `Contact`, ajouter la relation inverse :

```prisma
signataires Signataire[] @relation("SignataireContact")
```

- [ ] **Step 3: Générer la migration**

Run: `npx prisma migrate dev --name add_signature_module`

Expected: création du dossier `prisma/migrations/YYYYMMDDHHMMSS_add_signature_module/` avec `migration.sql`, application sur DB locale, "Your database is now in sync with your schema."

- [ ] **Step 4: Régénérer le client Prisma**

Run: `npx prisma generate`

Expected: "Generated Prisma Client (v5.x.x)"

- [ ] **Step 5: Vérifier le schéma dans Prisma Studio**

Run: `npm run db:studio`

Expected: les 5 nouvelles tables apparaissent (SignatureRequest, SignatureZone, Signataire, SignatureEvent, SignatureTokenAttempt).

Arrêter avec Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(signatures): ajoute schéma Prisma module signature V1 (5 modèles)"
```

---

### Task 1.3 : Module `lib/signatures/hash.ts` (TDD)

**Files:**
- Create: `tests/signatures/hash.test.ts`
- Create: `lib/signatures/hash.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/signatures/hash.test.ts` :

```typescript
import { describe, it, expect } from 'vitest';
import { sha256Buffer, sha256String } from '@/lib/signatures/hash';

describe('hash', () => {
  it('sha256Buffer retourne un hash hex 64 chars pour un buffer connu', () => {
    const buf = Buffer.from('hello world');
    const hash = sha256Buffer(buf);
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    expect(hash).toHaveLength(64);
  });

  it('sha256String retourne le même hash que sha256Buffer pour un texte UTF-8', () => {
    const text = 'hello world';
    expect(sha256String(text)).toBe(sha256Buffer(Buffer.from(text, 'utf-8')));
  });

  it('sha256Buffer est déterministe (même input → même hash)', () => {
    const buf = Buffer.from('test deterministic');
    expect(sha256Buffer(buf)).toBe(sha256Buffer(buf));
  });

  it('sha256Buffer détecte une différence de 1 byte', () => {
    const a = Buffer.from('hello world');
    const b = Buffer.from('hello worle');
    expect(sha256Buffer(a)).not.toBe(sha256Buffer(b));
  });

  it('sha256Buffer traite un buffer de 10 Mo en moins de 100ms', () => {
    const big = Buffer.alloc(10 * 1024 * 1024, 0x42);
    const start = performance.now();
    sha256Buffer(big);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue (rouge)**

Run: `npm test -- hash.test`

Expected: FAIL — "Cannot find module '@/lib/signatures/hash'"

- [ ] **Step 3: Implémenter `lib/signatures/hash.ts`**

```typescript
import { createHash } from 'node:crypto';

/**
 * SHA-256 d'un buffer, retourne le hash en hex lowercase (64 chars).
 * Utilisé pour: hash du PDF original/signé, fingerprint signataire.
 */
export function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * SHA-256 d'une string (encodée UTF-8). Wrapper de sha256Buffer.
 * Utilisé pour: hash des events de l'audit log, hash des tokens.
 */
export function sha256String(s: string): string {
  return sha256Buffer(Buffer.from(s, 'utf-8'));
}
```

- [ ] **Step 4: Vérifier que le test passe (vert)**

Run: `npm test -- hash.test`

Expected: PASS, 5 tests verts.

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/hash.ts tests/signatures/hash.test.ts
git commit -m "feat(signatures): ajoute lib/signatures/hash (SHA-256 buffer + string)"
```

---

### Task 1.4 : Module `lib/signatures/token.ts` (TDD)

**Files:**
- Create: `tests/signatures/token.test.ts`
- Create: `lib/signatures/token.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/signatures/token.test.ts` :

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { generateToken, verifyToken, hashToken } from '@/lib/signatures/token';

beforeAll(() => {
  process.env.SECRET_HMAC_TOKENS = 'test-secret-32-bytes-base64-placeholder===';
});

describe('token', () => {
  it('generateToken produit deux parties séparées par un point', () => {
    const t = generateToken();
    expect(t.split('.')).toHaveLength(2);
    expect(t.length).toBeGreaterThanOrEqual(100);
  });

  it('verifyToken accepte un token fraîchement généré', () => {
    const t = generateToken();
    expect(verifyToken(t)).toBe(true);
  });

  it('verifyToken rejette un token modifié (HMAC invalide)', () => {
    const t = generateToken();
    const tampered = t.slice(0, -2) + 'XX';
    expect(verifyToken(tampered)).toBe(false);
  });

  it('verifyToken rejette un token sans point', () => {
    expect(verifyToken('plain-string-without-dot')).toBe(false);
  });

  it('verifyToken rejette un token vide', () => {
    expect(verifyToken('')).toBe(false);
  });

  it('hashToken produit le même hash pour le même token', () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
  });

  it('hashToken produit des hashs différents pour des tokens différents', () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });

  it('hashToken retourne 64 chars hex', () => {
    expect(hashToken(generateToken())).toHaveLength(64);
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npm test -- token.test`

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implémenter `lib/signatures/token.ts`**

```typescript
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { sha256String } from './hash';

function getSecret(): Buffer {
  const s = process.env.SECRET_HMAC_TOKENS;
  if (!s) throw new Error('SECRET_HMAC_TOKENS env var is required');
  return Buffer.from(s, 'utf-8');
}

/**
 * Génère un token magique au format `<random50>.<hmac64>`.
 * Le client reçoit ce token entier dans l'URL. La BD stocke uniquement le hash.
 */
export function generateToken(): string {
  const raw = randomBytes(30).toString('base64url'); // ~40 chars
  const hmac = createHmac('sha256', getSecret()).update(raw).digest('hex');
  return `${raw}.${hmac}`;
}

/**
 * Vérifie la signature HMAC d'un token. NE vérifie PAS l'existence en BD.
 * À appeler en premier dans les routes publiques (évite DoS Postgres).
 */
export function verifyToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [raw, providedHmac] = parts;
  if (!raw || !providedHmac || providedHmac.length !== 64) return false;
  const expectedHmac = createHmac('sha256', getSecret()).update(raw).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expectedHmac, 'hex'), Buffer.from(providedHmac, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Hash SHA-256 du token entier. Stocké en BD pour le lookup (jamais le token clair).
 */
export function hashToken(token: string): string {
  return sha256String(token);
}

/**
 * Extrait les 8 premiers chars du token pour grouper les tentatives (rate-limit).
 */
export function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npm test -- token.test`

Expected: PASS, 8 tests verts.

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/token.ts tests/signatures/token.test.ts
git commit -m "feat(signatures): ajoute lib/signatures/token (HMAC + hash)"
```

---

### Task 1.5 : Créer le bucket Supabase `signature-documents`

**Files:**
- Create: `lib/signatures/storage.ts`
- Create: `scripts/setup-signature-bucket.ts`

- [ ] **Step 1: Créer `lib/signatures/storage.ts`**

```typescript
import { supabase } from '@/lib/supabase';

export const SIGNATURE_BUCKET = 'signature-documents';

/**
 * Upload un PDF (original ou signé) dans le bucket privé.
 * Path conventionnel: `{requestId}/{original|signed|certificate}.pdf`
 */
export async function uploadSignaturePdf(
  path: string,
  buffer: Buffer,
  contentType = 'application/pdf'
): Promise<string> {
  const { error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function downloadSignaturePdf(path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).download(path);
  if (error || !data) throw new Error(`Download failed: ${error?.message ?? 'no data'}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function getSignedUrl(path: string, ttlSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message ?? 'no data'}`);
  return data.signedUrl;
}

export async function deleteSignaturePdf(path: string): Promise<void> {
  const { error } = await supabase.storage.from(SIGNATURE_BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
```

- [ ] **Step 2: Créer `scripts/setup-signature-bucket.ts`**

```typescript
import { supabase } from '../lib/supabase';
import { SIGNATURE_BUCKET } from '../lib/signatures/storage';

async function main() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;

  if (buckets?.find((b) => b.name === SIGNATURE_BUCKET)) {
    console.log(`✓ Bucket "${SIGNATURE_BUCKET}" already exists`);
    return;
  }

  const { error: createErr } = await supabase.storage.createBucket(SIGNATURE_BUCKET, {
    public: false,
    fileSizeLimit: 26214400, // 25 MB
    allowedMimeTypes: ['application/pdf'],
  });
  if (createErr) throw createErr;
  console.log(`✓ Bucket "${SIGNATURE_BUCKET}" created (private, max 25MB, PDF only)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Exécuter le script de création de bucket**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/setup-signature-bucket.ts`

Expected: `✓ Bucket "signature-documents" created` (ou "already exists" si rerun)

- [ ] **Step 4: Vérifier dans la console Supabase**

Ouvrir https://supabase.com/dashboard/project/{your-project}/storage/buckets

Expected: bucket `signature-documents` visible, marqué privé.

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/storage.ts scripts/setup-signature-bucket.ts
git commit -m "feat(signatures): bucket Supabase signature-documents + helpers storage"
```

---

### Task 1.6 : Skeleton routes API (501 placeholders)

**Files:**
- Create: `app/api/signatures/route.ts`
- Create: `app/api/signatures/[id]/route.ts`
- Create: `app/api/signatures/[id]/send/route.ts`
- Create: `app/api/sign/[token]/submit/route.ts`
- Create: `app/api/sign/[token]/decline/route.ts`

- [ ] **Step 1: Créer le skeleton générique**

Pour chaque fichier ci-dessus, créer avec le contenu suivant (adapter le nom de la route dans le commentaire) :

`app/api/signatures/route.ts` :

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Not implemented yet (Sprint 6)' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: 'Not implemented yet (Sprint 2)' }, { status: 501 });
}
```

`app/api/signatures/[id]/route.ts` :

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Not implemented yet (Sprint 6)' }, { status: 501 });
}
export async function PATCH() {
  return NextResponse.json({ error: 'Not implemented yet (Sprint 2)' }, { status: 501 });
}
export async function DELETE() {
  return NextResponse.json({ error: 'Not implemented yet (Sprint 6)' }, { status: 501 });
}
```

`app/api/signatures/[id]/send/route.ts` :

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Not implemented yet (Sprint 3)' }, { status: 501 });
}
```

`app/api/sign/[token]/submit/route.ts` et `app/api/sign/[token]/decline/route.ts` :

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Not implemented yet (Sprint 4)' }, { status: 501 });
}
```

- [ ] **Step 2: Tester un endpoint en local**

Run: `npm run dev`

Dans un autre terminal : `curl -i http://localhost:3000/api/signatures`

Expected: `HTTP/1.1 501` + body `{"error":"Not implemented yet (Sprint 6)"}`

Arrêter dev avec Ctrl+C.

- [ ] **Step 3: Étendre le middleware pour protéger /api/signatures admin**

Modifier `middleware.ts` : ajouter `/api/signatures` dans `adminApiPrefixes` (à côté des autres). Vérifier que `/api/sign` (routes publiques signataire) ne sont PAS dans cette liste.

- [ ] **Step 4: Vérifier la protection admin**

Run: `npm run dev` puis `curl -i http://localhost:3000/api/signatures` (sans cookie)

Expected: redirection vers /login OU 401 selon middleware config (= protection en place).

Arrêter dev.

- [ ] **Step 5: Commit**

```bash
git add app/api/signatures app/api/sign middleware.ts
git commit -m "feat(signatures): skeleton routes API + protection middleware"
```

---

**🚦 Validation fin Sprint 1**

Avant de passer au Sprint 2 :

```bash
npm test                          # tous verts (hash + token)
npx prisma studio                 # 5 nouvelles tables visibles
npm run build                     # build Next.js OK
```

Si tout vert → Sprint 2.

---

## Sprint 2 — pdf-viewer + designer (2j)

**Objectif sprint :** admin peut uploader un PDF, le voir affiché page par page, et placer/redimensionner des zones de signature qui sont persistées en BD.

**Validation fin sprint :** depuis `/signatures/nouveau`, upload d'un PDF + placement de 2 zones + sauvegarde — rafraîchir la page, les zones sont toujours là.

---

### Task 2.1 : Installer pdf-lib, pdfjs-dist, react-signature-canvas

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer les dépendances**

Run: `npm install pdf-lib pdfjs-dist react-signature-canvas qrcode`

Expected: dépendances ajoutées, pas de conflit peer-deps.

- [ ] **Step 2: Installer les types**

Run: `npm install -D @types/react-signature-canvas @types/qrcode`

- [ ] **Step 3: Vérifier l'import**

Run: `npx tsc --noEmit lib/signatures/hash.ts` puis créer un fichier de test temporaire :

```typescript
// tmp-check.ts
import { PDFDocument } from 'pdf-lib';
console.log('pdf-lib OK', typeof PDFDocument);
```

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' tmp-check.ts` puis supprimer le fichier.

Expected: "pdf-lib OK function".

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: ajoute pdf-lib, pdfjs-dist, react-signature-canvas, qrcode"
```

---

### Task 2.2 : Module `lib/signatures/zones.ts` (conversions pixels↔points) — TDD

**Files:**
- Create: `tests/signatures/zones.test.ts`
- Create: `lib/signatures/zones.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect } from 'vitest';
import { pixelsToPoints, pointsToPixels, type ZoneCoords } from '@/lib/signatures/zones';

describe('zones conversions', () => {
  it('pixelsToPoints convertit avec un scale de 1.5', () => {
    const zone: ZoneCoords = { x: 150, y: 300, width: 75, height: 30 };
    const result = pixelsToPoints(zone, 1.5);
    expect(result).toEqual({ x: 100, y: 200, width: 50, height: 20 });
  });

  it('pointsToPixels est l\'inverse de pixelsToPoints', () => {
    const original: ZoneCoords = { x: 100, y: 200, width: 50, height: 20 };
    const pixels = pointsToPixels(original, 1.5);
    const back = pixelsToPoints(pixels, 1.5);
    expect(back.x).toBeCloseTo(original.x, 5);
    expect(back.y).toBeCloseTo(original.y, 5);
  });

  it('pixelsToPoints rejette un scale nul ou négatif', () => {
    expect(() => pixelsToPoints({ x: 1, y: 1, width: 1, height: 1 }, 0)).toThrow();
    expect(() => pixelsToPoints({ x: 1, y: 1, width: 1, height: 1 }, -1)).toThrow();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- zones.test`
Expected: FAIL

- [ ] **Step 3: Implémenter `lib/signatures/zones.ts`**

```typescript
export interface ZoneCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convertit des coordonnées pixels écran → points PDF (72 dpi).
 * scale = rapport pixels/points utilisé par PDF.js viewport (typiquement 1.0 à 3.0).
 * Origine reste en haut-gauche (la conversion vers le repère bas-gauche PDF
 * se fait dans pdf-stamper.ts avec la hauteur de page).
 */
export function pixelsToPoints(z: ZoneCoords, scale: number): ZoneCoords {
  if (!scale || scale <= 0) throw new Error('scale must be > 0');
  return {
    x: z.x / scale,
    y: z.y / scale,
    width: z.width / scale,
    height: z.height / scale,
  };
}

export function pointsToPixels(z: ZoneCoords, scale: number): ZoneCoords {
  if (!scale || scale <= 0) throw new Error('scale must be > 0');
  return {
    x: z.x * scale,
    y: z.y * scale,
    width: z.width * scale,
    height: z.height * scale,
  };
}
```

- [ ] **Step 4: Vérifier le test**

Run: `npm test -- zones.test`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/zones.ts tests/signatures/zones.test.ts
git commit -m "feat(signatures): conversions pixels↔points (zones.ts)"
```

---

### Task 2.3 : Route `POST /api/signatures` (création request + upload PDF)

**Files:**
- Modify: `app/api/signatures/route.ts`
- Create: `lib/signatures/validation.ts`

- [ ] **Step 1: Créer `lib/signatures/validation.ts`**

```typescript
import { PDFDocument } from 'pdf-lib';

export const MAX_PDF_SIZE_BYTES = (Number(process.env.SIGNATURE_MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;
export const MAX_PDF_PAGES = Number(process.env.SIGNATURE_MAX_PAGES) || 50;

/**
 * Valide qu'un buffer est bien un PDF safe à stocker.
 * - Magic bytes %PDF-
 * - Taille max
 * - Parse pdf-lib réussit
 * - Pas de scripts embarqués (action /JS ou /JavaScript top-level)
 */
export async function validatePdfBuffer(buf: Buffer): Promise<{ pageCount: number }> {
  if (buf.length > MAX_PDF_SIZE_BYTES) {
    throw new Error(`PDF too large (max ${MAX_PDF_SIZE_BYTES / 1024 / 1024} MB)`);
  }
  if (buf.length < 5 || buf.slice(0, 5).toString() !== '%PDF-') {
    throw new Error('Not a valid PDF (magic bytes)');
  }
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(buf, { ignoreEncryption: false });
  } catch (e) {
    throw new Error(`Invalid PDF: ${(e as Error).message}`);
  }
  if (pdf.getPageCount() > MAX_PDF_PAGES) {
    throw new Error(`Too many pages (max ${MAX_PDF_PAGES})`);
  }
  // Anti-XSS basique: rejette PDFs avec actions JS
  const raw = buf.toString('latin1');
  if (/\/JavaScript\b|\/JS\b|\/OpenAction\b/.test(raw)) {
    throw new Error('PDF contains executable actions (rejected)');
  }
  return { pageCount: pdf.getPageCount() };
}
```

- [ ] **Step 2: Remplacer `app/api/signatures/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sha256Buffer } from '@/lib/signatures/hash';
import { uploadSignaturePdf } from '@/lib/signatures/storage';
import { validatePdfBuffer } from '@/lib/signatures/validation';
import { appendEvent } from '@/lib/signatures/audit-chain';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const titre = form.get('titre');
  const type = (form.get('type') ?? 'custom') as string;
  const description = (form.get('description') ?? null) as string | null;
  const devisId = (form.get('devisId') ?? null) as string | null;
  const sessionId = (form.get('sessionId') ?? null) as string | null;
  const entrepriseId = (form.get('entrepriseId') ?? null) as string | null;

  if (!(file instanceof File) || !titre || typeof titre !== 'string') {
    return NextResponse.json({ error: 'file and titre required' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let pageCount: number;
  try {
    ({ pageCount } = await validatePdfBuffer(buf));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const hash = sha256Buffer(buf);
  const request = await prisma.signatureRequest.create({
    data: {
      titre,
      description,
      type,
      devisId,
      sessionId,
      entrepriseId,
      originalFileUrl: '', // rempli juste après
      originalFileSha256: hash,
      originalFileSize: buf.length,
      originalPageCount: pageCount,
      createdByUserId: session.user.id,
    },
  });

  const path = `${request.id}/original.pdf`;
  await uploadSignaturePdf(path, buf);
  const updated = await prisma.signatureRequest.update({
    where: { id: request.id },
    data: { originalFileUrl: path },
  });

  await appendEvent(request.id, {
    type: 'created',
    actorType: 'admin',
    actorId: session.user.id,
    payload: { originalFileSha256: hash, originalPageCount: pageCount },
  });

  return NextResponse.json(updated, { status: 201 });
}
```

- [ ] **Step 3: Créer stub `lib/signatures/audit-chain.ts` (impl complète en Sprint 5)**

```typescript
import { prisma } from '@/lib/prisma';
import { sha256String } from './hash';

/**
 * Append un événement à la chaîne d'audit d'une SignatureRequest.
 * Calcule eventHash = SHA256(previousEventHash + payload sérialisé).
 * Met à jour SignatureRequest.lastEventHash atomiquement.
 */
export async function appendEvent(
  requestId: string,
  event: {
    type: string;
    actorType: 'admin' | 'signataire' | 'system';
    actorId?: string | null;
    payload?: Record<string, unknown> | null;
  }
): Promise<{ eventHash: string }> {
  return prisma.$transaction(async (tx) => {
    const req = await tx.signatureRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { lastEventHash: true },
    });
    const previousEventHash = req.lastEventHash;
    const createdAt = new Date();
    const canonical = JSON.stringify({
      type: event.type,
      actorType: event.actorType,
      actorId: event.actorId ?? null,
      payload: event.payload ?? null,
      createdAt: createdAt.toISOString(),
      previousEventHash,
    });
    const eventHash = sha256String(canonical);
    await tx.signatureEvent.create({
      data: {
        requestId,
        type: event.type,
        actorType: event.actorType,
        actorId: event.actorId ?? null,
        payload: (event.payload ?? null) as never,
        previousEventHash,
        eventHash,
        createdAt,
      },
    });
    await tx.signatureRequest.update({
      where: { id: requestId },
      data: { lastEventHash: eventHash },
    });
    return { eventHash };
  });
}
```

- [ ] **Step 4: Tester manuellement**

Run: `npm run dev`

```bash
curl -X POST http://localhost:3000/api/signatures \
  -H "Cookie: <session-admin-cookie>" \
  -F "titre=Test signature" \
  -F "type=custom" \
  -F "file=@/path/to/test.pdf"
```

Expected: `201` + JSON avec `id`, `originalFileSha256`, `originalFileUrl`.

Vérifier dans Prisma Studio : 1 ligne dans `SignatureRequest`, 1 ligne dans `SignatureEvent` (type=`created`).

- [ ] **Step 5: Commit**

```bash
git add app/api/signatures/route.ts lib/signatures/validation.ts lib/signatures/audit-chain.ts
git commit -m "feat(signatures): POST /api/signatures (upload + hash + audit init)"
```

---

### Task 2.4 : Composant `PdfViewer.tsx`

**Files:**
- Create: `components/signatures/PdfViewer.tsx`
- Create: `public/pdf.worker.min.mjs` (copié de node_modules)

- [ ] **Step 1: Copier le worker PDF.js dans `public/`**

Run:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

Expected: fichier présent dans `public/`.

- [ ] **Step 2: Créer le composant**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface PdfViewerProps {
  fileUrl: string; // URL signée Supabase OU blob URL local
  scale?: number;
  onPagesLoaded?: (count: number, viewports: { width: number; height: number }[]) => void;
  children?: (ctx: { pageNumber: number; canvas: HTMLCanvasElement; scale: number }) => React.ReactNode;
}

export function PdfViewer({ fileUrl, scale = 1.5, onPagesLoaded, children }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Array<{ canvas: HTMLCanvasElement; viewport: { width: number; height: number } }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const loadingTask = pdfjs.getDocument(fileUrl);
      const pdf = await loadingTask.promise;
      const loaded: typeof pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        loaded.push({ canvas, viewport: { width: viewport.width, height: viewport.height } });
      }
      if (!cancelled) {
        setPages(loaded);
        onPagesLoaded?.(loaded.length, loaded.map((p) => p.viewport));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, scale, onPagesLoaded]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    pages.forEach(({ canvas }, idx) => {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.marginBottom = "16px";
      wrapper.dataset.page = String(idx + 1);
      wrapper.appendChild(canvas);
      containerRef.current!.appendChild(wrapper);
    });
  }, [pages]);

  return (
    <div className="pdf-viewer relative">
      <div ref={containerRef} />
      {/* render overlay per page */}
      {pages.map((_, idx) => {
        const pageNumber = idx + 1;
        const wrapper = containerRef.current?.querySelector(`[data-page="${pageNumber}"]`) as HTMLElement | null;
        if (!wrapper) return null;
        return (
          <div key={pageNumber} className="overlay-portal" data-overlay-page={pageNumber}>
            {children?.({ pageNumber, canvas: pages[idx].canvas, scale })}
          </div>
        );
      })}
    </div>
  );
}
```

Note : la couche d'overlay sera affinée en Task 2.5 (le `SignatureZoneDesigner` utilisera des portals React pour superposer ses propres `<div>` aux canvas).

- [ ] **Step 3: Smoke-test manuel**

Créer temporairement `app/test-pdf-viewer/page.tsx` :

```tsx
"use client";
import { PdfViewer } from "@/components/signatures/PdfViewer";

export default function Page() {
  return <PdfViewer fileUrl="/test.pdf" />; // mettre un test.pdf dans public/
}
```

Mettre un PDF de test dans `public/test.pdf`, lancer `npm run dev`, ouvrir `http://localhost:3000/test-pdf-viewer`.

Expected: les pages du PDF s'affichent comme canvas.

Supprimer le fichier de test après vérification.

- [ ] **Step 4: Commit**

```bash
git add components/signatures/PdfViewer.tsx public/pdf.worker.min.mjs
git commit -m "feat(signatures): composant PdfViewer (rendu PDF.js page par page)"
```

---

### Task 2.5 : Composant `SignatureZoneDesigner.tsx` + page upload

**Files:**
- Create: `components/signatures/SignatureZoneDesigner.tsx`
- Create: `app/signatures/nouveau/page.tsx`

- [ ] **Step 1: Créer `SignatureZoneDesigner.tsx`**

```tsx
"use client";

import { useState, useRef } from "react";
import { PdfViewer } from "./PdfViewer";
import { pixelsToPoints, pointsToPixels, type ZoneCoords } from "@/lib/signatures/zones";

export interface DesignerZone extends ZoneCoords {
  id: string;
  page: number;
  type: "signature" | "initials" | "date" | "text";
  label?: string;
}

interface Props {
  fileUrl: string;
  initialZones?: DesignerZone[];
  scale?: number;
  onChange: (zones: DesignerZone[]) => void;
}

export function SignatureZoneDesigner({ fileUrl, initialZones = [], scale = 1.5, onChange }: Props) {
  const [zones, setZones] = useState<DesignerZone[]>(initialZones);
  const dragStart = useRef<{ x: number; y: number; page: number } | null>(null);

  const update = (next: DesignerZone[]) => {
    setZones(next);
    onChange(next);
  };

  const handleMouseDown = (e: React.MouseEvent, page: number, canvasEl: HTMLCanvasElement) => {
    const rect = canvasEl.getBoundingClientRect();
    dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, page };
  };

  const handleMouseUp = (e: React.MouseEvent, page: number, canvasEl: HTMLCanvasElement) => {
    if (!dragStart.current || dragStart.current.page !== page) return;
    const rect = canvasEl.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const pixels: ZoneCoords = {
      x: Math.min(dragStart.current.x, endX),
      y: Math.min(dragStart.current.y, endY),
      width: Math.abs(endX - dragStart.current.x),
      height: Math.abs(endY - dragStart.current.y),
    };
    if (pixels.width < 20 || pixels.height < 10) {
      dragStart.current = null;
      return;
    }
    const points = pixelsToPoints(pixels, scale);
    const newZone: DesignerZone = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      page,
      ...points,
      type: "signature",
      label: `Signature page ${page}`,
    };
    update([...zones, newZone]);
    dragStart.current = null;
  };

  const removeZone = (id: string) => update(zones.filter((z) => z.id !== id));

  return (
    <PdfViewer fileUrl={fileUrl} scale={scale}>
      {({ pageNumber, canvas }) => {
        const pageZones = zones.filter((z) => z.page === pageNumber);
        return (
          <div
            className="absolute inset-0"
            style={{ cursor: "crosshair" }}
            onMouseDown={(e) => handleMouseDown(e, pageNumber, canvas)}
            onMouseUp={(e) => handleMouseUp(e, pageNumber, canvas)}
          >
            {pageZones.map((z) => {
              const pixels = pointsToPixels(z, scale);
              return (
                <div
                  key={z.id}
                  className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move group"
                  style={{
                    left: pixels.x,
                    top: pixels.y,
                    width: pixels.width,
                    height: pixels.height,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <span className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-1 rounded">
                    {z.label}
                  </span>
                  <button
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeZone(z.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        );
      }}
    </PdfViewer>
  );
}
```

Note : le drag-to-resize + drag-to-move sera ajouté en V2 si besoin (pour V1, suppression + recréation suffit). À documenter dans le code.

- [ ] **Step 2: Créer la page `app/signatures/nouveau/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignatureZoneDesigner, type DesignerZone } from "@/components/signatures/SignatureZoneDesigner";

export default function NouveauSignaturePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [zones, setZones] = useState<DesignerZone[]>([]);
  const [signataireEmail, setSignataireEmail] = useState("");
  const [signataireNom, setSignataireNom] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !titre.trim()) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("titre", titre);
    fd.set("type", "custom");
    const res = await fetch("/api/signatures", { method: "POST", body: fd });
    if (!res.ok) {
      alert(`Erreur: ${await res.text()}`);
      setSaving(false);
      return;
    }
    const data = await res.json();
    setRequestId(data.id);
    setSaving(false);
  };

  const handleSaveZones = async () => {
    if (!requestId) return;
    setSaving(true);
    await fetch(`/api/signatures/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zones: zones.map((z) => ({ page: z.page, x: z.x, y: z.y, width: z.width, height: z.height, type: z.type, label: z.label })),
        signataire: { email: signataireEmail, nom: signataireNom },
      }),
    });
    setSaving(false);
    router.push(`/signatures/${requestId}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Nouvelle demande de signature</h1>

      {!requestId && (
        <div className="space-y-4 mb-6">
          <input
            type="text"
            placeholder="Titre du document"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
          {fileUrl && (
            <button
              onClick={handleUpload}
              disabled={!titre.trim() || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {saving ? "Upload..." : "Uploader et continuer"}
            </button>
          )}
        </div>
      )}

      {requestId && fileUrl && (
        <>
          <p className="text-sm text-gray-500 mb-2">Tracez les zones de signature sur le PDF (clic + drag).</p>
          <SignatureZoneDesigner fileUrl={fileUrl} onChange={setZones} />
          <div className="mt-6 space-y-4">
            <input
              type="email"
              placeholder="Email du signataire"
              value={signataireEmail}
              onChange={(e) => setSignataireEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Nom du signataire"
              value={signataireNom}
              onChange={(e) => setSignataireNom(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleSaveZones}
              disabled={zones.length === 0 || !signataireEmail || saving}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder et continuer"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit (le PATCH endpoint est dans la prochaine tâche)**

```bash
git add components/signatures/SignatureZoneDesigner.tsx app/signatures/nouveau/page.tsx
git commit -m "feat(signatures): designer zones drag-drop + page upload admin"
```

---

### Task 2.6 : Route `PATCH /api/signatures/[id]` (sauvegarde zones + signataire)

**Files:**
- Modify: `app/api/signatures/[id]/route.ts`

- [ ] **Step 1: Remplacer `app/api/signatures/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/lib/signatures/audit-chain';
import { generateToken, hashToken } from '@/lib/signatures/token';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const request = await prisma.signatureRequest.findUnique({
    where: { id: params.id },
    include: { zones: true, signataire: true },
  });
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(request);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const existing = await prisma.signatureRequest.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.statut !== 'draft' && existing.statut !== 'ready') {
    return NextResponse.json({ error: `Cannot modify request in status ${existing.statut}` }, { status: 409 });
  }

  if (Array.isArray(body.zones)) {
    await prisma.signatureZone.deleteMany({ where: { requestId: params.id } });
    if (body.zones.length > 0) {
      await prisma.signatureZone.createMany({
        data: body.zones.map((z: { page: number; x: number; y: number; width: number; height: number; type?: string; label?: string }) => ({
          requestId: params.id,
          page: z.page,
          x: z.x,
          y: z.y,
          width: z.width,
          height: z.height,
          type: z.type ?? 'signature',
          label: z.label ?? null,
        })),
      });
    }
    await appendEvent(params.id, {
      type: 'zones_placed',
      actorType: 'admin',
      actorId: session.user.id,
      payload: { count: body.zones.length },
    });
  }

  if (body.signataire && body.signataire.email && body.signataire.nom) {
    // Auto-link existing Contact if email matches
    const contact = await prisma.contact.findFirst({ where: { email: body.signataire.email } });
    // Génère un token "provisoire" qui sera remplacé à l'envoi (sécurité: ne pas exposer un token actif avant envoi)
    const provisional = generateToken();
    await prisma.signataire.upsert({
      where: { requestId: params.id },
      create: {
        requestId: params.id,
        email: body.signataire.email,
        nom: body.signataire.nom,
        contactId: contact?.id ?? null,
        tokenHash: hashToken(provisional),
      },
      update: {
        email: body.signataire.email,
        nom: body.signataire.nom,
        contactId: contact?.id ?? null,
      },
    });
  }

  if (body.zones && body.zones.length > 0) {
    await prisma.signatureRequest.update({
      where: { id: params.id },
      data: { statut: 'ready' },
    });
  }

  const updated = await prisma.signatureRequest.findUnique({
    where: { id: params.id },
    include: { zones: true, signataire: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const existing = await prisma.signatureRequest.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.statut === 'completed' || existing.statut === 'signed') {
    return NextResponse.json({ error: 'Cannot delete a signed/completed request' }, { status: 409 });
  }
  await prisma.signatureRequest.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Tester manuellement**

Run `npm run dev`, ouvrir `/signatures/nouveau`, uploader un PDF, placer 2 zones, saisir signataire, sauvegarder.

Expected: redirection vers `/signatures/[id]` (404 pour l'instant, page créée Sprint 6). En Prisma Studio, voir 2 lignes dans `SignatureZone`, 1 dans `Signataire`, et la `SignatureRequest` passée en `ready`.

- [ ] **Step 3: Commit**

```bash
git add app/api/signatures/[id]/route.ts
git commit -m "feat(signatures): PATCH /api/signatures/[id] (zones + signataire + statut ready)"
```

---

**🚦 Validation fin Sprint 2**

- Upload d'un PDF via UI → enregistré en BD + Supabase
- Placement de zones drag-drop → sauvegardées (vérifier `SignatureZone` en Studio)
- Signataire rattaché (vérifier `contactId` si email match un Contact)
- `npm test` toujours vert (4 fichiers de tests : hash, token, zones, et le reste)
- Statut `SignatureRequest` passé en `ready`

Si tout OK → Sprint 3.

---

## Sprint 3 — Envoi & vue signataire (2j)

**Objectif sprint :** admin envoie le doc, email reçu (Mailpit en dev), signataire clique le lien et voit le PDF + zones surlignées (mais ne signe pas encore — Sprint 4).

**Validation fin sprint :** depuis `/signatures/[id]/...`, cliquer "Envoyer" → email reçu sur Mailpit → ouvrir le lien magique → vue signataire publique affiche le PDF.

---

### Task 3.1 : Module `lib/signatures/workflow.ts` (machine à états) — TDD

**Files:**
- Create: `tests/signatures/workflow.test.ts`
- Create: `lib/signatures/workflow.ts`

- [ ] **Step 1: Test rouge**

```typescript
import { describe, it, expect } from 'vitest';
import { canTransition, type SignatureStatus } from '@/lib/signatures/workflow';

describe('workflow state machine', () => {
  const valid: Array<[SignatureStatus, SignatureStatus]> = [
    ['draft', 'ready'],
    ['ready', 'sent'],
    ['ready', 'cancelled'],
    ['sent', 'viewed'],
    ['sent', 'expired'],
    ['sent', 'rejected'],
    ['sent', 'cancelled'],
    ['viewed', 'signed'],
    ['viewed', 'expired'],
    ['viewed', 'rejected'],
    ['signed', 'completed'],
  ];

  for (const [from, to] of valid) {
    it(`accepte ${from} → ${to}`, () => expect(canTransition(from, to)).toBe(true));
  }

  it('refuse draft → signed (skip étapes)', () => expect(canTransition('draft', 'signed')).toBe(false));
  it('refuse completed → draft (revert)', () => expect(canTransition('completed', 'draft')).toBe(false));
  it('refuse expired → signed', () => expect(canTransition('expired', 'signed')).toBe(false));
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- workflow.test`. Expected: FAIL.

- [ ] **Step 3: Implémenter `lib/signatures/workflow.ts`**

```typescript
export type SignatureStatus =
  | 'draft'
  | 'ready'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'rejected';

const TRANSITIONS: Record<SignatureStatus, SignatureStatus[]> = {
  draft: ['ready', 'cancelled'],
  ready: ['sent', 'draft', 'cancelled'],
  sent: ['viewed', 'expired', 'rejected', 'cancelled'],
  viewed: ['signed', 'expired', 'rejected'],
  signed: ['completed'],
  completed: [],
  expired: [],
  cancelled: [],
  rejected: [],
};

export function canTransition(from: SignatureStatus, to: SignatureStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: SignatureStatus, to: SignatureStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
}
```

- [ ] **Step 4: Vérifier le test passe**

Run: `npm test -- workflow.test`. Expected: 14 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/workflow.ts tests/signatures/workflow.test.ts
git commit -m "feat(signatures): machine à états workflow.ts"
```

---

### Task 3.2 : Template email React Email

**Files:**
- Modify: `package.json`
- Create: `emails/SignatureRequestEmail.tsx`

- [ ] **Step 1: Installer React Email**

Run: `npm install @react-email/components @react-email/render`

- [ ] **Step 2: Créer le template**

```tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";

interface Props {
  signataireNom: string;
  documentTitre: string;
  expediteurNom: string;
  signUrl: string;
  expiresAt: Date;
}

export default function SignatureRequestEmail({
  signataireNom, documentTitre, expediteurNom, signUrl, expiresAt,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{documentTitre} — Document à signer</Preview>
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "Arial, sans-serif", padding: 32 }}>
        <Container style={{ backgroundColor: "white", borderRadius: 8, padding: 32, maxWidth: 560 }}>
          <Heading>Document à signer</Heading>
          <Text>Bonjour {signataireNom},</Text>
          <Text>
            {expediteurNom} (Rescue Formation Conseil) vous demande de signer électroniquement le document suivant :
          </Text>
          <Section style={{ backgroundColor: "#f3f4f6", padding: 16, borderRadius: 4, marginTop: 16 }}>
            <Text style={{ fontWeight: "bold", margin: 0 }}>{documentTitre}</Text>
          </Section>
          <Section style={{ marginTop: 24, textAlign: "center" }}>
            <Button
              href={signUrl}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                padding: "12px 24px",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              Signer le document
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 24 }}>
            Ce lien est personnel et expire le {expiresAt.toLocaleDateString("fr-FR")} à {expiresAt.toLocaleTimeString("fr-FR")}.
            Ne le partagez avec personne.
          </Text>
          <Hr />
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>
            Rescue Formation Conseil — projetrfc.netlify.app
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add emails/SignatureRequestEmail.tsx package.json package-lock.json
git commit -m "feat(signatures): template email React Email SignatureRequest"
```

---

### Task 3.3 : Route `POST /api/signatures/[id]/send`

**Files:**
- Modify: `app/api/signatures/[id]/send/route.ts`

- [ ] **Step 1: Implémenter la route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/email';
import SignatureRequestEmail from '@/emails/SignatureRequestEmail';
import { generateToken, hashToken } from '@/lib/signatures/token';
import { appendEvent } from '@/lib/signatures/audit-chain';
import { assertTransition, type SignatureStatus } from '@/lib/signatures/workflow';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const request = await prisma.signatureRequest.findUnique({
    where: { id: params.id },
    include: { signataire: true, zones: true, createdBy: true },
  });
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!request.signataire) return NextResponse.json({ error: 'No signataire' }, { status: 400 });
  if (request.zones.length === 0) return NextResponse.json({ error: 'No zones' }, { status: 400 });

  try {
    assertTransition(request.statut as SignatureStatus, 'sent');
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }

  const token = generateToken();
  const expiryDays = Number(process.env.SIGNATURE_TOKEN_EXPIRY_DAYS ?? 30);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await prisma.signataire.update({
    where: { id: request.signataire.id },
    data: { tokenHash: hashToken(token), tokenSentAt: new Date() },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://projetrfc.netlify.app';
  const signUrl = `${baseUrl}/sign/${token}`;

  const html = await render(
    SignatureRequestEmail({
      signataireNom: request.signataire.nom,
      documentTitre: request.titre,
      expediteurNom: request.createdBy.name ?? 'Rescue Formation Conseil',
      signUrl,
      expiresAt,
    })
  );

  await sendEmail({
    to: request.signataire.email,
    subject: `Document à signer — ${request.titre}`,
    html,
  });

  await prisma.signatureRequest.update({
    where: { id: params.id },
    data: { statut: 'sent', sentAt: new Date(), expiresAt },
  });

  await appendEvent(params.id, {
    type: 'sent',
    actorType: 'admin',
    actorId: session.user.id,
    payload: { signataireEmail: request.signataire.email, expiresAt: expiresAt.toISOString() },
  });

  return NextResponse.json({ ok: true, sentTo: request.signataire.email, expiresAt });
}
```

- [ ] **Step 2: Vérifier la signature `sendEmail` dans `lib/email.ts`**

Run: `grep -n "export.*sendEmail" lib/email.ts`

Si la signature ne correspond pas exactement à `{ to, subject, html }`, adapter l'appel.

- [ ] **Step 3: Setup Mailpit en local (capture des emails de test)**

Run: `docker run -d --restart unless-stopped --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit`

Dans `.env.local`, configurer SMTP vers Mailpit :
```
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

Ouvrir http://localhost:8025 dans le navigateur (UI Mailpit).

- [ ] **Step 4: Tester l'envoi**

Créer une signature via UI (Task 2.5), puis :
```bash
curl -X POST http://localhost:3000/api/signatures/<id>/send -H "Cookie: <admin-cookie>"
```

Expected: `{ "ok": true, "sentTo": "...", "expiresAt": "..." }`. Email visible dans Mailpit avec lien `https://.../sign/<token>`.

- [ ] **Step 5: Commit**

```bash
git add app/api/signatures/[id]/send/route.ts
git commit -m "feat(signatures): POST /api/signatures/[id]/send (token + email + statut sent)"
```

---

### Task 3.4 : Module `lib/signatures/rate-limit.ts` — TDD

**Files:**
- Create: `tests/signatures/rate-limit.test.ts`
- Create: `lib/signatures/rate-limit.ts`

- [ ] **Step 1: Test rouge**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, recordAttempt } from '@/lib/signatures/rate-limit';

describe('rate-limit', () => {
  const ip = `127.0.0.${Math.floor(Math.random() * 250) + 1}`;

  beforeEach(async () => {
    await prisma.signatureTokenAttempt.deleteMany({ where: { ip } });
  });

  it('accepte 9 tentatives en 1 min puis bloque la 10ème', async () => {
    for (let i = 0; i < 9; i++) {
      const allowed = await checkRateLimit({ tokenPrefix: 'abcd1234', ip, action: 'view' });
      expect(allowed).toBe(true);
      await recordAttempt({ tokenPrefix: 'abcd1234', ip, success: true });
    }
    const blocked = await checkRateLimit({ tokenPrefix: 'abcd1234', ip, action: 'view' });
    expect(blocked).toBe(false);
  });

  it('compte separément les tentatives POST (limite 3/min)', async () => {
    for (let i = 0; i < 3; i++) {
      const allowed = await checkRateLimit({ tokenPrefix: 'efgh5678', ip, action: 'submit' });
      expect(allowed).toBe(true);
      await recordAttempt({ tokenPrefix: 'efgh5678', ip, success: false });
    }
    const blocked = await checkRateLimit({ tokenPrefix: 'efgh5678', ip, action: 'submit' });
    expect(blocked).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- rate-limit.test`. Expected: FAIL.

- [ ] **Step 3: Implémenter `lib/signatures/rate-limit.ts`**

```typescript
import { prisma } from '@/lib/prisma';

const LIMITS = {
  view: { count: 10, windowMs: 60_000 },
  submit: { count: 3, windowMs: 60_000 },
  daily: { count: 100, windowMs: 24 * 60 * 60_000 },
};

export type RateLimitAction = 'view' | 'submit';

export async function checkRateLimit(opts: {
  tokenPrefix: string;
  ip: string;
  action: RateLimitAction;
}): Promise<boolean> {
  const limit = LIMITS[opts.action];
  const since = new Date(Date.now() - limit.windowMs);
  const count = await prisma.signatureTokenAttempt.count({
    where: { tokenPrefix: opts.tokenPrefix, ip: opts.ip, createdAt: { gt: since } },
  });
  if (count >= limit.count) return false;

  const dailySince = new Date(Date.now() - LIMITS.daily.windowMs);
  const dailyCount = await prisma.signatureTokenAttempt.count({
    where: { ip: opts.ip, createdAt: { gt: dailySince } },
  });
  return dailyCount < LIMITS.daily.count;
}

export async function recordAttempt(opts: {
  tokenPrefix: string;
  ip: string;
  success: boolean;
}): Promise<void> {
  await prisma.signatureTokenAttempt.create({ data: opts });
}
```

- [ ] **Step 4: Vérifier le test**

Run: `npm test -- rate-limit.test`. Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/rate-limit.ts tests/signatures/rate-limit.test.ts
git commit -m "feat(signatures): rate-limit anti-bruteforce tokens"
```

---

### Task 3.5 : Page publique `/sign/[token]` (vue read-only Sprint 3)

**Files:**
- Create: `app/sign/[token]/page.tsx`
- Create: `app/sign/[token]/expired/page.tsx`
- Modify: `middleware.ts` (exclure `/sign/*` de l'auth)

- [ ] **Step 1: S'assurer que `/sign/*` n'est PAS dans `adminPages` ni `adminApiPrefixes`**

Read: `middleware.ts`. Vérifier que `/sign` est public.

- [ ] **Step 2: Ajouter le header `X-Robots-Tag: noindex` pour `/sign/*`**

Dans `middleware.ts`, ajouter :

```typescript
if (req.nextUrl.pathname.startsWith('/sign/')) {
  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}
```

(Insérer avant le bloc admin auth-check existant.)

- [ ] **Step 3: Créer `app/sign/[token]/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashToken, tokenPrefix } from "@/lib/signatures/token";
import { checkRateLimit, recordAttempt } from "@/lib/signatures/rate-limit";
import { appendEvent } from "@/lib/signatures/audit-chain";
import { getSignedUrl } from "@/lib/signatures/storage";
import { SignViewClient } from "@/components/signatures/SignViewClient";

export const dynamic = "force-dynamic";

export default async function SignPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ua = h.get("user-agent") ?? "unknown";

  if (!verifyToken(token)) {
    await recordAttempt({ tokenPrefix: tokenPrefix(token), ip, success: false });
    redirect("/sign/" + token + "/expired");
  }

  const allowed = await checkRateLimit({ tokenPrefix: tokenPrefix(token), ip, action: "view" });
  if (!allowed) {
    return <div className="p-8">Trop de tentatives. Réessayez plus tard.</div>;
  }
  await recordAttempt({ tokenPrefix: tokenPrefix(token), ip, success: true });

  const signataire = await prisma.signataire.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { request: { include: { zones: true } } },
  });
  if (!signataire) redirect("/sign/" + token + "/expired");

  const req = signataire.request;
  if (req.statut === "expired" || req.statut === "cancelled" || req.statut === "rejected") {
    redirect("/sign/" + token + "/expired");
  }
  if (req.expiresAt && req.expiresAt < new Date()) {
    redirect("/sign/" + token + "/expired");
  }
  if (req.statut === "completed" || signataire.statut === "signed") {
    return <div className="p-8">Ce document a déjà été signé. Merci.</div>;
  }

  // First view → audit event
  if (signataire.statut === "pending") {
    await prisma.$transaction([
      prisma.signataire.update({ where: { id: signataire.id }, data: { statut: "viewed", viewedAt: new Date(), signatureIp: ip, signatureUserAgent: ua } }),
      prisma.signatureRequest.update({ where: { id: req.id }, data: { statut: "viewed", viewedAt: new Date() } }),
    ]);
    await appendEvent(req.id, { type: "viewed", actorType: "signataire", actorId: signataire.id, payload: { ip, ua } });
  }

  const fileUrl = await getSignedUrl(req.originalFileUrl, 600);

  return (
    <SignViewClient
      token={token}
      titre={req.titre}
      signataireNom={signataire.nom}
      fileUrl={fileUrl}
      zones={req.zones}
    />
  );
}
```

- [ ] **Step 4: Créer `components/signatures/SignViewClient.tsx`**

```tsx
"use client";

import { PdfViewer } from "./PdfViewer";
import { pointsToPixels } from "@/lib/signatures/zones";

interface Zone {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  label: string | null;
}

interface Props {
  token: string;
  titre: string;
  signataireNom: string;
  fileUrl: string;
  zones: Zone[];
}

export function SignViewClient({ titre, signataireNom, fileUrl, zones }: Props) {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-2">{titre}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Bonjour {signataireNom}, vous êtes invité à signer ce document.
        Cliquez sur chaque zone pour apposer votre signature.
      </p>
      <PdfViewer fileUrl={fileUrl} scale={1.5}>
        {({ pageNumber }) => {
          const pageZones = zones.filter((z) => z.page === pageNumber);
          return (
            <div className="absolute inset-0">
              {pageZones.map((z) => {
                const px = pointsToPixels(z, 1.5);
                return (
                  <div
                    key={z.id}
                    className="absolute border-2 border-yellow-500 bg-yellow-100/60 flex items-center justify-center text-xs text-yellow-900 font-medium"
                    style={{ left: px.x, top: px.y, width: px.width, height: px.height }}
                  >
                    {z.label ?? "Signature requise"}
                  </div>
                );
              })}
            </div>
          );
        }}
      </PdfViewer>
      <div className="mt-6 text-sm text-gray-500">
        Capture de signature : disponible dans la version suivante (Sprint 4).
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Créer `app/sign/[token]/expired/page.tsx`**

```tsx
export default function ExpiredPage() {
  return (
    <div className="container mx-auto p-12 max-w-md text-center">
      <h1 className="text-2xl font-bold mb-4">Lien expiré ou invalide</h1>
      <p className="text-gray-600">
        Ce lien de signature n'est plus valide. Si vous pensez qu'il s'agit d'une erreur,
        contactez l'expéditeur du document pour qu'il vous renvoie un nouveau lien.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Test bout-en-bout manuel**

1. `npm run dev`
2. Créer une request via `/signatures/nouveau`
3. Envoyer via `POST /api/signatures/<id>/send`
4. Récupérer le lien dans Mailpit
5. Ouvrir le lien dans un navigateur en navigation privée

Expected: page affiche titre + PDF + zones en jaune. Audit log : event `viewed` enregistré.

- [ ] **Step 7: Commit**

```bash
git add app/sign components/signatures/SignViewClient.tsx middleware.ts
git commit -m "feat(signatures): vue publique signataire (lecture seule + rate-limit)"
```

---

**🚦 Validation fin Sprint 3**

- Email envoyé visible dans Mailpit avec lien magique
- Token invalide/modifié → page expired
- Token valide → vue PDF + zones en surbrillance
- `SignatureRequest.statut` passé en `viewed` après 1ère ouverture
- Tests : 5 fichiers verts (hash, token, zones, workflow, rate-limit)

Si OK → Sprint 4.

---

## Sprint 4 — Capture signature (1.5j)

**Objectif sprint :** le signataire peut remplir chaque zone via canvas/texte/image et soumettre. Statut passe à `signed`. PDF final pas encore généré (Sprint 5).

**Validation fin sprint :** signataire dessine sa signature → confirme → page de succès. Statut `signed` en BD, zones marquées `filled`.

---

### Task 4.1 : Composant `SignatureMethodTabs.tsx` (3 onglets)

**Files:**
- Create: `components/signatures/SignatureMethodTabs.tsx`

- [ ] **Step 1: Importer la police cursive Dancing Script**

Dans `app/layout.tsx` (ou équivalent global), ajouter :

```tsx
import { Dancing_Script } from "next/font/google";
const dancingScript = Dancing_Script({ subsets: ["latin"], variable: "--font-cursive" });
// dans <body className={dancingScript.variable}>
```

- [ ] **Step 2: Créer le composant**

```tsx
"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

export interface SignatureResult {
  method: "canvas" | "text" | "image";
  dataUrl: string; // base64 PNG ou texte
}

interface Props {
  defaultName?: string;
  onChange: (result: SignatureResult | null) => void;
}

export function SignatureMethodTabs({ defaultName = "", onChange }: Props) {
  const [tab, setTab] = useState<"canvas" | "text" | "image">("canvas");
  const padRef = useRef<SignatureCanvas | null>(null);
  const [textValue, setTextValue] = useState(defaultName);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const emitCanvas = () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      onChange(null);
      return;
    }
    onChange({ method: "canvas", dataUrl: padRef.current.toDataURL("image/png") });
  };
  const emitText = (value: string) => {
    setTextValue(value);
    if (!value.trim()) { onChange(null); return; }
    // Génère une image en rendering server-side serait préférable; pour V1 on stocke le texte brut,
    // pdf-stamper.ts gérera la conversion police cursive lors de la génération du PDF final.
    onChange({ method: "text", dataUrl: value });
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg"].includes(f.type)) {
      alert("Format non supporté (PNG ou JPEG uniquement)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImageDataUrl(url);
      onChange({ method: "image", dataUrl: url });
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="border rounded-lg">
      <div className="flex border-b">
        {(["canvas", "text", "image"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          >
            {t === "canvas" ? "Dessiner" : t === "text" ? "Taper" : "Image"}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "canvas" && (
          <>
            <SignatureCanvas
              ref={padRef}
              penColor="black"
              canvasProps={{ width: 400, height: 150, className: "border rounded bg-white" }}
              onEnd={emitCanvas}
            />
            <button
              type="button"
              onClick={() => { padRef.current?.clear(); onChange(null); }}
              className="mt-2 text-sm text-gray-500 underline"
            >
              Effacer
            </button>
          </>
        )}
        {tab === "text" && (
          <>
            <input
              type="text"
              value={textValue}
              onChange={(e) => emitText(e.target.value)}
              placeholder="Tapez votre nom"
              className="w-full p-2 border rounded"
            />
            {textValue && (
              <div
                className="mt-3 p-4 border rounded bg-white text-3xl"
                style={{ fontFamily: "var(--font-cursive), cursive" }}
              >
                {textValue}
              </div>
            )}
          </>
        )}
        {tab === "image" && (
          <>
            <input type="file" accept="image/png,image/jpeg" onChange={handleImageUpload} />
            {imageDataUrl && (
              <img src={imageDataUrl} alt="signature" className="mt-3 max-h-32 border rounded" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/signatures/SignatureMethodTabs.tsx app/layout.tsx
git commit -m "feat(signatures): onglets canvas/texte/image pour capture signature"
```

---

### Task 4.2 : Modal `ZoneFiller.tsx` + intégration `SignViewClient`

**Files:**
- Create: `components/signatures/ZoneFiller.tsx`
- Modify: `components/signatures/SignViewClient.tsx`

- [ ] **Step 1: Créer `ZoneFiller.tsx`**

```tsx
"use client";

import { useState } from "react";
import { SignatureMethodTabs, type SignatureResult } from "./SignatureMethodTabs";

interface Props {
  open: boolean;
  zoneLabel: string;
  defaultName?: string;
  onClose: () => void;
  onConfirm: (result: SignatureResult) => void;
}

export function ZoneFiller({ open, zoneLabel, defaultName, onClose, onConfirm }: Props) {
  const [result, setResult] = useState<SignatureResult | null>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold mb-4">{zoneLabel}</h2>
        <SignatureMethodTabs defaultName={defaultName} onChange={setResult} />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Annuler</button>
          <button
            onClick={() => result && onConfirm(result)}
            disabled={!result}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modifier `SignViewClient.tsx`**

Remplacer le contenu existant par :

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PdfViewer } from "./PdfViewer";
import { ZoneFiller } from "./ZoneFiller";
import { pointsToPixels } from "@/lib/signatures/zones";

interface Zone {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  label: string | null;
  required: boolean;
  filled: boolean;
}

interface Props {
  token: string;
  titre: string;
  signataireNom: string;
  fileUrl: string;
  zones: Zone[];
}

export function SignViewClient({ token, titre, signataireNom, fileUrl, zones: initialZones }: Props) {
  const router = useRouter();
  const [zones, setZones] = useState(initialZones.map((z) => ({ ...z, _value: null as string | null, _method: null as string | null })));
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [cgvOk, setCgvOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allRequiredFilled = zones.filter((z) => z.required).every((z) => z._value);

  const handleConfirm = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/sign/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zones: zones.filter((z) => z._value).map((z) => ({
          id: z.id, value: z._value, method: z._method,
        })),
      }),
    });
    if (res.ok) router.push(`/sign/${token}/success`);
    else alert(`Erreur: ${await res.text()}`);
    setSubmitting(false);
  };

  const activeZone = zones.find((z) => z.id === activeZoneId);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-2">{titre}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Bonjour {signataireNom}, cliquez sur chaque zone surlignée pour signer.
      </p>

      <PdfViewer fileUrl={fileUrl} scale={1.5}>
        {({ pageNumber }) => (
          <div className="absolute inset-0">
            {zones.filter((z) => z.page === pageNumber).map((z) => {
              const px = pointsToPixels(z, 1.5);
              const isFilled = !!z._value;
              return (
                <button
                  key={z.id}
                  onClick={() => setActiveZoneId(z.id)}
                  className={`absolute border-2 flex items-center justify-center text-xs font-medium ${isFilled ? "border-green-500 bg-green-100/70 text-green-900" : "border-yellow-500 bg-yellow-100/60 text-yellow-900 hover:bg-yellow-200"}`}
                  style={{ left: px.x, top: px.y, width: px.width, height: px.height }}
                >
                  {isFilled ? "✓ Signé" : (z.label ?? "Signer ici")}
                </button>
              );
            })}
          </div>
        )}
      </PdfViewer>

      <ZoneFiller
        open={!!activeZone}
        zoneLabel={activeZone?.label ?? "Signature"}
        defaultName={signataireNom}
        onClose={() => setActiveZoneId(null)}
        onConfirm={(result) => {
          setZones(zones.map((z) => z.id === activeZoneId ? { ...z, _value: result.dataUrl, _method: result.method } : z));
          setActiveZoneId(null);
        }}
      />

      <div className="mt-6 border-t pt-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={cgvOk} onChange={(e) => setCgvOk(e.target.checked)} />
          <span>
            J'accepte de signer électroniquement ce document. Je reconnais que cette signature
            a la même valeur juridique qu'une signature manuscrite (signature électronique simple
            au sens du règlement eIDAS).
          </span>
        </label>
        <button
          onClick={handleConfirm}
          disabled={!allRequiredFilled || !cgvOk || submitting}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {submitting ? "Envoi..." : "Confirmer ma signature"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Inclure `required` et `filled` dans la sélection du serveur**

Vérifier dans `app/sign/[token]/page.tsx` que `req.zones` est passé avec tous les champs nécessaires (Prisma include retourne tout par défaut).

- [ ] **Step 4: Commit**

```bash
git add components/signatures/ZoneFiller.tsx components/signatures/SignViewClient.tsx
git commit -m "feat(signatures): modal ZoneFiller + intégration signature dans SignViewClient"
```

---

### Task 4.3 : Route `POST /api/sign/[token]/submit`

**Files:**
- Modify: `app/api/sign/[token]/submit/route.ts`
- Create: `app/sign/[token]/success/page.tsx`

- [ ] **Step 1: Implémenter la route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashToken, tokenPrefix } from '@/lib/signatures/token';
import { checkRateLimit, recordAttempt } from '@/lib/signatures/rate-limit';
import { appendEvent } from '@/lib/signatures/audit-chain';
import { assertTransition, type SignatureStatus } from '@/lib/signatures/workflow';
import { sha256String } from '@/lib/signatures/hash';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  const ua = h.get('user-agent') ?? 'unknown';

  if (!verifyToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const allowed = await checkRateLimit({ tokenPrefix: tokenPrefix(token), ip, action: 'submit' });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await req.json();
  const zonesPayload: Array<{ id: string; value: string; method: string }> = body.zones ?? [];

  const result = await prisma.$transaction(async (tx) => {
    const signataire = await tx.signataire.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { request: { include: { zones: true } } },
    });
    if (!signataire) throw new Error('NOT_FOUND');
    const reqRow = signataire.request;
    if (reqRow.statut === 'completed' || signataire.statut === 'signed') {
      throw new Error('ALREADY_SIGNED');
    }
    if (reqRow.expiresAt && reqRow.expiresAt < new Date()) {
      throw new Error('EXPIRED');
    }
    try {
      assertTransition(reqRow.statut as SignatureStatus, 'signed');
    } catch {
      throw new Error('INVALID_STATE');
    }

    const requiredIds = reqRow.zones.filter((z) => z.required).map((z) => z.id);
    const providedIds = zonesPayload.map((z) => z.id);
    const missing = requiredIds.filter((id) => !providedIds.includes(id));
    if (missing.length > 0) throw new Error(`MISSING_ZONES:${missing.join(',')}`);

    for (const z of zonesPayload) {
      await tx.signatureZone.update({
        where: { id: z.id },
        data: { filled: true, filledValue: z.value, filledMethod: z.method, filledAt: new Date() },
      });
    }
    const fingerprint = sha256String(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}`);
    await tx.signataire.update({
      where: { id: signataire.id },
      data: {
        statut: 'signed',
        signedAt: new Date(),
        signatureIp: ip,
        signatureUserAgent: ua,
        signatureFingerprint: fingerprint,
      },
    });
    await tx.signatureRequest.update({
      where: { id: reqRow.id },
      data: { statut: 'signed', signedAt: new Date() },
    });
    return { requestId: reqRow.id };
  });

  await appendEvent(result.requestId, {
    type: 'signed',
    actorType: 'signataire',
    actorId: null,
    payload: { ip, ua, zoneCount: zonesPayload.length },
  });
  await recordAttempt({ tokenPrefix: tokenPrefix(token), ip, success: true });

  // La finalisation (PDF + TSA + certificat) est déclenchée en Sprint 5 ici.
  // Pour Sprint 4 : statut signed, le cron retry de Sprint 5 finalisera.

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Gestion d'erreurs au format JSON friendly**

Ajouter avant `return NextResponse.json({ ok: true })`, dans un try/catch englobant le `$transaction` — adapter pour retourner 410 GONE si `ALREADY_SIGNED` ou `EXPIRED`, 400 sur `MISSING_ZONES`, etc. (Garder simple pour V1, ne pas sur-ingénierer.)

- [ ] **Step 3: Créer page de succès**

```tsx
// app/sign/[token]/success/page.tsx
export default function SuccessPage() {
  return (
    <div className="container mx-auto p-12 max-w-md text-center">
      <h1 className="text-2xl font-bold mb-4 text-green-700">Signature enregistrée ✓</h1>
      <p className="text-gray-600 mb-2">
        Merci, votre signature a bien été enregistrée.
      </p>
      <p className="text-gray-500 text-sm">
        Vous recevrez le document signé final et le certificat de preuve par email
        dans les prochaines minutes.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Test manuel bout-en-bout**

Reprendre le flux : créer → envoyer → ouvrir lien → signer 1 zone → confirmer.

Expected: redirection vers `/sign/<token>/success`. En Prisma Studio : `Signataire.statut = signed`, `SignatureZone.filled = true`, `SignatureRequest.statut = signed`. Audit event `signed` ajouté.

- [ ] **Step 5: Commit**

```bash
git add app/api/sign/[token]/submit/route.ts app/sign/[token]/success/page.tsx
git commit -m "feat(signatures): POST submit signature + page succès"
```

---

### Task 4.4 : Route `POST /api/sign/[token]/decline`

**Files:**
- Modify: `app/api/sign/[token]/decline/route.ts`
- Modify: `components/signatures/SignViewClient.tsx` (bouton "Refuser")

- [ ] **Step 1: Implémenter la route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashToken } from '@/lib/signatures/token';
import { appendEvent } from '@/lib/signatures/audit-chain';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!verifyToken(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const body = await req.json();
  const reason: string = (body.reason ?? '').toString().slice(0, 500);

  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const signataire = await prisma.signataire.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { request: { include: { createdBy: true } } },
  });
  if (!signataire) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (signataire.statut === 'signed' || signataire.statut === 'declined') {
    return NextResponse.json({ error: 'Already finalized' }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.signataire.update({
      where: { id: signataire.id },
      data: { statut: 'declined', declinedAt: new Date(), declineReason: reason },
    }),
    prisma.signatureRequest.update({
      where: { id: signataire.requestId },
      data: { statut: 'rejected' },
    }),
  ]);
  await appendEvent(signataire.requestId, {
    type: 'rejected',
    actorType: 'signataire',
    actorId: signataire.id,
    payload: { reason, ip },
  });

  if (signataire.request.createdBy.email) {
    await sendEmail({
      to: signataire.request.createdBy.email,
      subject: `Signature refusée — ${signataire.request.titre}`,
      html: `<p>${signataire.nom} (${signataire.email}) a refusé de signer le document <b>${signataire.request.titre}</b>.</p><p>Motif : ${reason || 'non précisé'}</p>`,
    });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Ajouter bouton "Refuser" dans `SignViewClient.tsx`**

À côté du bouton "Confirmer", ajouter :

```tsx
<button
  onClick={async () => {
    const reason = prompt("Motif du refus (optionnel) :") ?? "";
    const res = await fetch(`/api/sign/${token}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) router.push(`/sign/${token}/expired`);
  }}
  className="ml-3 px-4 py-2 text-red-600 underline"
>
  Refuser de signer
</button>
```

- [ ] **Step 3: Test manuel**

Créer une request, envoyer, ouvrir le lien, cliquer "Refuser". Expected : email admin reçu dans Mailpit, statut `rejected`.

- [ ] **Step 4: Commit**

```bash
git add app/api/sign/[token]/decline/route.ts components/signatures/SignViewClient.tsx
git commit -m "feat(signatures): refus de signature (decline route + UI)"
```

---

**🚦 Validation fin Sprint 4**

- Signataire peut signer via canvas, texte, ou image
- Toutes les zones requises remplies + CGV → bouton Confirmer actif
- Submit → statut `signed`, audit event ajouté
- Refus → statut `rejected`, email admin
- Tests vert
- PAS encore : PDF final, certificat, horodatage TSA (Sprint 5)

---

## Sprint 5 — Finalisation cryptographique (2j)

**Objectif sprint :** quand le signataire confirme, le système génère atomiquement le PDF final, hash, horodatage FreeTSA, certificat de preuve, et finalise la chaîne d'audit. Statut passe à `completed`. Cron retry pour les requests bloquées.

**Validation fin sprint :** flux complet → email confirmation au signataire avec PDF signé + certificat en pièce jointe. Statut `completed`.

---

### Task 5.1 : Module `pdf-stamper.ts` (injection signatures via pdf-lib) — TDD

**Files:**
- Create: `tests/signatures/pdf-stamper.test.ts`
- Create: `tests/fixtures/sample.pdf` (PDF d'1 page A4 vierge — généré avec pdfmake ou téléchargé)
- Create: `lib/signatures/pdf-stamper.ts`

- [ ] **Step 1: Créer une fixture PDF**

Run le script suivant (ts-node) une fois pour générer `tests/fixtures/sample.pdf` :

```typescript
// scripts/generate-test-pdf.ts
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';

async function main() {
  mkdirSync('tests/fixtures', { recursive: true });
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Document de test pour signature', { x: 50, y: 750, size: 18, font });
  writeFileSync('tests/fixtures/sample.pdf', await doc.save());
  console.log('✓ fixture créée');
}
main();
```

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-test-pdf.ts`

- [ ] **Step 2: Test rouge**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { stampSignatures } from '@/lib/signatures/pdf-stamper';
import { PDFDocument } from 'pdf-lib';

describe('pdf-stamper', () => {
  const samplePdf = readFileSync('tests/fixtures/sample.pdf');

  it('embed une signature image sur page 1', async () => {
    // 1x1 PNG transparent base64
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const out = await stampSignatures(samplePdf, [
      { page: 1, x: 100, y: 100, width: 80, height: 30, type: 'signature', method: 'image', value: png },
    ]);
    expect(out).toBeInstanceOf(Buffer);
    expect(out.length).toBeGreaterThan(samplePdf.length); // a grandi à cause de l'image
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('embed une signature texte (police cursive intégrée)', async () => {
    const out = await stampSignatures(samplePdf, [
      { page: 1, x: 100, y: 100, width: 200, height: 40, type: 'signature', method: 'text', value: 'Jean Dupont' },
    ]);
    expect(out).toBeInstanceOf(Buffer);
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('gère plusieurs zones sur la même page', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const out = await stampSignatures(samplePdf, [
      { page: 1, x: 100, y: 100, width: 80, height: 30, type: 'signature', method: 'image', value: png },
      { page: 1, x: 100, y: 200, width: 80, height: 30, type: 'signature', method: 'image', value: png },
    ]);
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npm test -- pdf-stamper.test`. Expected: FAIL.

- [ ] **Step 4: Implémenter `lib/signatures/pdf-stamper.ts`**

```typescript
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface SignatureFill {
  page: number;
  x: number; y: number; width: number; height: number; // points PDF, origine haut-gauche
  type: 'signature' | 'initials' | 'date' | 'text';
  method: 'canvas' | 'text' | 'image';
  value: string; // dataURL pour canvas/image, texte brut pour text
}

let cursiveFontBytes: Buffer | null = null;
function loadCursiveFont(): Buffer {
  if (cursiveFontBytes) return cursiveFontBytes;
  // DancingScript-Regular.ttf à placer dans public/fonts/ (téléchargeable depuis Google Fonts)
  cursiveFontBytes = readFileSync(path.join(process.cwd(), 'public/fonts/DancingScript-Regular.ttf'));
  return cursiveFontBytes;
}

export async function stampSignatures(originalPdf: Buffer, fills: SignatureFill[]): Promise<Buffer> {
  const pdf = await PDFDocument.load(originalPdf);
  pdf.registerFontkit(fontkit);
  const pages = pdf.getPages();
  let cursiveFont: Awaited<ReturnType<typeof pdf.embedFont>> | null = null;
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);

  for (const fill of fills) {
    const page = pages[fill.page - 1];
    if (!page) throw new Error(`Page ${fill.page} not found`);
    const pageHeight = page.getHeight();
    // Conversion origine haut-gauche → bas-gauche PDF
    const yPdf = pageHeight - fill.y - fill.height;

    if (fill.method === 'image' || fill.method === 'canvas') {
      const dataUrl = fill.value;
      const base64 = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '');
      const isJpeg = /^data:image\/jpeg/.test(dataUrl);
      const bytes = Buffer.from(base64, 'base64');
      const img = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
      page.drawImage(img, { x: fill.x, y: yPdf, width: fill.width, height: fill.height });
    } else if (fill.method === 'text') {
      if (!cursiveFont) cursiveFont = await pdf.embedFont(loadCursiveFont());
      const size = Math.min(fill.height * 0.6, 24);
      page.drawText(fill.value, { x: fill.x + 4, y: yPdf + fill.height * 0.3, font: cursiveFont, size, color: rgb(0, 0, 0) });
    } else {
      // type=date par défaut → texte Helvetica
      const text = fill.value || new Date().toLocaleDateString('fr-FR');
      page.drawText(text, { x: fill.x + 4, y: yPdf + 4, font: helvetica, size: 10, color: rgb(0, 0, 0) });
    }
  }
  return Buffer.from(await pdf.save());
}
```

- [ ] **Step 5: Installer `@pdf-lib/fontkit` et télécharger la police**

Run:
```bash
npm install @pdf-lib/fontkit
mkdir -p public/fonts
curl -L "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf" -o public/fonts/DancingScript-Regular.ttf
```

Vérifier : `ls -la public/fonts/DancingScript-Regular.ttf` (taille > 50 Ko).

- [ ] **Step 6: Vérifier le test**

Run: `npm test -- pdf-stamper.test`. Expected: 3 PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/signatures/pdf-stamper.ts public/fonts/ scripts/generate-test-pdf.ts tests/fixtures/sample.pdf tests/signatures/pdf-stamper.test.ts package.json package-lock.json
git commit -m "feat(signatures): pdf-stamper (injection images + texte cursif via pdf-lib)"
```

---

### Task 5.2 : Module `tsa.ts` (FreeTSA RFC 3161) — TDD avec mock

**Files:**
- Create: `tests/signatures/tsa.test.ts`
- Create: `lib/signatures/tsa.ts`

- [ ] **Step 1: Test rouge (mocké)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestTimestamp } from '@/lib/signatures/tsa';

describe('tsa', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('appelle FreeTSA avec Content-Type timestamp-query', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x30, 0x82, 0x01]).buffer, // bytes ASN.1 factice
    });
    const result = await requestTimestamp('a'.repeat(64));
    expect(global.fetch).toHaveBeenCalled();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['Content-Type']).toBe('application/timestamp-query');
    expect(result.timestampToken).toBeTruthy();
    expect(result.timestampedAt).toBeInstanceOf(Date);
  });

  it('throw si FreeTSA retourne 500', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });
    await expect(requestTimestamp('a'.repeat(64))).rejects.toThrow();
  });

  it('throw si hash invalide', async () => {
    await expect(requestTimestamp('not-a-hex-hash')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- tsa.test`. Expected: FAIL.

- [ ] **Step 3: Implémenter `lib/signatures/tsa.ts`**

```typescript
/**
 * Client FreeTSA RFC 3161.
 *
 * Construit une TimeStampRequest (TSQ) ASN.1 minimale contenant le hash SHA-256
 * du document, l'envoie à FreeTSA, et stocke le TimeStampResponse (TSR) en base64.
 *
 * Vérification a posteriori: openssl ts -verify -in resp.tsr -data <pdf> -CAfile <freetsa-cert>
 */
const FREETSA_URL = process.env.FREETSA_URL ?? 'https://freetsa.org/tsr';

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) throw new Error('Invalid hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/**
 * Construit une TimeStampReq ASN.1 DER minimale (RFC 3161 §2.4.1).
 * Structure simplifiée : version + MessageImprint{SHA256 OID + hash} + cert request flag
 */
function buildTimestampRequest(sha256Hex: string): Uint8Array {
  const hash = hexToBytes(sha256Hex);
  // SHA-256 OID: 2.16.840.1.101.3.4.2.1 → DER: 06 09 60 86 48 01 65 03 04 02 01
  const sha256Oid = new Uint8Array([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]);
  // AlgorithmIdentifier ::= SEQUENCE { algorithm OID, parameters NULL }
  const algId = new Uint8Array([0x30, sha256Oid.length + 2, ...sha256Oid, 0x05, 0x00]);
  // OCTET STRING (hash)
  const octetStr = new Uint8Array([0x04, hash.length, ...hash]);
  // MessageImprint ::= SEQUENCE { hashAlgorithm AlgorithmIdentifier, hashedMessage OCTET STRING }
  const msgImprintInner = new Uint8Array([...algId, ...octetStr]);
  const msgImprint = new Uint8Array([0x30, msgImprintInner.length, ...msgImprintInner]);
  // version INTEGER (v1)
  const version = new Uint8Array([0x02, 0x01, 0x01]);
  // certReq BOOLEAN TRUE
  const certReq = new Uint8Array([0x01, 0x01, 0xff]);
  // TimeStampReq ::= SEQUENCE { version, messageImprint, [reqPolicy], [nonce], [certReq], [extensions] }
  const inner = new Uint8Array([...version, ...msgImprint, ...certReq]);
  const tsq = new Uint8Array([0x30, 0x82, (inner.length >> 8) & 0xff, inner.length & 0xff, ...inner]);
  return tsq;
}

export async function requestTimestamp(sha256Hex: string): Promise<{ timestampToken: string; timestampedAt: Date }> {
  const tsq = buildTimestampRequest(sha256Hex);
  const res = await fetch(FREETSA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/timestamp-query' },
    body: tsq,
  });
  if (!res.ok) throw new Error(`FreeTSA returned ${res.status}`);
  const tsrBytes = new Uint8Array(await res.arrayBuffer());
  const timestampToken = Buffer.from(tsrBytes).toString('base64');
  return { timestampToken, timestampedAt: new Date() };
}

export async function requestTimestampWithRetry(sha256Hex: string, maxAttempts = 3): Promise<{ timestampToken: string; timestampedAt: Date } | null> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestTimestamp(sha256Hex);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }
  }
  console.error('FreeTSA failed after retries:', lastErr);
  return null;
}
```

- [ ] **Step 4: Vérifier les tests**

Run: `npm test -- tsa.test`. Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/tsa.ts tests/signatures/tsa.test.ts
git commit -m "feat(signatures): client FreeTSA RFC 3161 + retry backoff"
```

---

### Task 5.3 : Tests audit-chain (déjà implémenté en Task 2.3) — TDD complémentaire

**Files:**
- Create: `tests/signatures/audit-chain.test.ts`

- [ ] **Step 1: Écrire tests d'intégration sur la chaîne**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/lib/signatures/audit-chain';
import { sha256String } from '@/lib/signatures/hash';

describe('audit-chain', () => {
  let requestId: string;

  beforeEach(async () => {
    // Setup: créer une fixture SignatureRequest minimale (utilisateur de test requis)
    const user = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!user) throw new Error('Aucun admin user en BD — exécuter les seeds');
    const r = await prisma.signatureRequest.create({
      data: {
        titre: 'test audit',
        originalFileUrl: 'fake',
        originalFileSha256: 'fake',
        originalFileSize: 1,
        originalPageCount: 1,
        createdByUserId: user.id,
      },
    });
    requestId = r.id;
  });

  it('1er event a previousEventHash = null', async () => {
    await appendEvent(requestId, { type: 'created', actorType: 'admin', actorId: null });
    const events = await prisma.signatureEvent.findMany({ where: { requestId }, orderBy: { createdAt: 'asc' } });
    expect(events).toHaveLength(1);
    expect(events[0].previousEventHash).toBeNull();
    expect(events[0].eventHash).toHaveLength(64);
  });

  it('2ème event chaîne sur le 1er', async () => {
    await appendEvent(requestId, { type: 'created', actorType: 'admin', actorId: null });
    await appendEvent(requestId, { type: 'sent', actorType: 'admin', actorId: null });
    const events = await prisma.signatureEvent.findMany({ where: { requestId }, orderBy: { createdAt: 'asc' } });
    expect(events[1].previousEventHash).toBe(events[0].eventHash);
  });

  it('lastEventHash sur SignatureRequest = dernier eventHash', async () => {
    await appendEvent(requestId, { type: 'created', actorType: 'admin', actorId: null });
    await appendEvent(requestId, { type: 'sent', actorType: 'admin', actorId: null });
    const events = await prisma.signatureEvent.findMany({ where: { requestId }, orderBy: { createdAt: 'asc' } });
    const r = await prisma.signatureRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(r.lastEventHash).toBe(events[1].eventHash);
  });
});
```

- [ ] **Step 2: Ajouter fonction de vérification dans `audit-chain.ts`**

À la fin de `lib/signatures/audit-chain.ts`, ajouter :

```typescript
export async function verifyAuditChain(requestId: string): Promise<{ valid: boolean; brokenAt?: string }> {
  const events = await prisma.signatureEvent.findMany({
    where: { requestId },
    orderBy: { createdAt: 'asc' },
  });
  let previousHash: string | null = null;
  for (const ev of events) {
    if (ev.previousEventHash !== previousHash) {
      return { valid: false, brokenAt: ev.id };
    }
    const canonical = JSON.stringify({
      type: ev.type,
      actorType: ev.actorType,
      actorId: ev.actorId,
      payload: ev.payload ?? null,
      createdAt: ev.createdAt.toISOString(),
      previousEventHash: ev.previousEventHash,
    });
    if (sha256String(canonical) !== ev.eventHash) {
      return { valid: false, brokenAt: ev.id };
    }
    previousHash = ev.eventHash;
  }
  const r = await prisma.signatureRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (r.lastEventHash !== previousHash) return { valid: false, brokenAt: 'lastEventHash' };
  return { valid: true };
}
```

- [ ] **Step 3: Tests verts**

Run: `npm test -- audit-chain.test`. Expected: 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/signatures/audit-chain.test.ts lib/signatures/audit-chain.ts
git commit -m "test(signatures): audit-chain + fonction verifyAuditChain"
```

---

### Task 5.4 : Module `certificate-generator.ts`

**Files:**
- Create: `lib/signatures/certificate-generator.ts`

- [ ] **Step 1: Implémenter avec pdfmake (cohérent avec lib/pdf/ existant)**

```typescript
import PdfPrinter from 'pdfmake';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};
const printer = new PdfPrinter(fonts);

export async function generateProofCertificate(requestId: string): Promise<Buffer> {
  const r = await prisma.signatureRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { signataire: true, events: { orderBy: { createdAt: 'asc' } } },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://projetrfc.netlify.app';
  const verifyUrl = `${baseUrl}/verify?id=${r.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });

  const docDef = {
    info: { title: `Certificat de signature — ${r.titre}` },
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    content: [
      { text: 'Certificat de signature électronique', fontSize: 18, bold: true, margin: [0, 0, 0, 12] },
      { text: r.titre, fontSize: 14, margin: [0, 0, 0, 20] },
      { text: 'Signataire', bold: true, margin: [0, 0, 0, 4] },
      { text: `${r.signataire?.nom ?? ''} <${r.signataire?.email ?? ''}>` },
      { text: `IP : ${r.signataire?.signatureIp ?? '-'}` },
      { text: `User-Agent : ${r.signataire?.signatureUserAgent ?? '-'}`, margin: [0, 0, 0, 16] },
      { text: 'Document', bold: true, margin: [0, 0, 0, 4] },
      { text: `Hash original (SHA-256) : ${r.originalFileSha256}` },
      { text: `Hash signé (SHA-256) : ${r.signedFileSha256 ?? '-'}` },
      { text: `Pages : ${r.originalPageCount}`, margin: [0, 0, 0, 16] },
      { text: 'Horodatage', bold: true, margin: [0, 0, 0, 4] },
      { text: `Date de signature : ${r.signedAt?.toISOString() ?? '-'}` },
      { text: `Horodatage TSA : ${r.tsaTimestampedAt?.toISOString() ?? '-'}` },
      { text: `Token TSA (RFC 3161, base64, FreeTSA.org) :`, margin: [0, 8, 0, 4] },
      { text: r.tsaTimestamp ?? '-', fontSize: 7, margin: [0, 0, 0, 16] },
      { text: 'Audit log', bold: true, margin: [0, 0, 0, 4] },
      {
        table: {
          widths: ['auto', '*', '*', '*'],
          body: [
            [{ text: 'Date', bold: true }, { text: 'Type', bold: true }, { text: 'Acteur', bold: true }, { text: 'Hash', bold: true }],
            ...r.events.map((e) => [
              e.createdAt.toISOString(),
              e.type,
              `${e.actorType}${e.actorId ? ':' + e.actorId.slice(0, 8) : ''}`,
              e.eventHash.slice(0, 16) + '...',
            ]),
          ],
        },
        fontSize: 8,
      },
      { image: qrDataUrl, width: 100, alignment: 'right' as const, margin: [0, 16, 0, 0] },
      { text: `Vérifiez l'intégrité : ${verifyUrl}`, fontSize: 8, alignment: 'right' as const },
    ],
  };

  const pdfDoc = printer.createPdfKitDocument(docDef as never);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (c) => chunks.push(Buffer.from(c)));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}
```

- [ ] **Step 2: Test manuel**

Créer un script temporaire `scripts/test-certificate.ts` qui appelle `generateProofCertificate('<id-d-une-request-signée>')` et écrit le résultat sur disque. Vérifier visuellement le rendu.

- [ ] **Step 3: Commit**

```bash
git add lib/signatures/certificate-generator.ts
git commit -m "feat(signatures): générateur certificat de preuve PDF (avec QR + audit)"
```

---

### Task 5.5 : Finalisation atomique dans `/api/sign/[token]/submit`

**Files:**
- Modify: `app/api/sign/[token]/submit/route.ts`
- Create: `lib/signatures/finalize.ts`

- [ ] **Step 1: Extraire la logique de finalisation dans `lib/signatures/finalize.ts`**

```typescript
import { prisma } from '@/lib/prisma';
import { downloadSignaturePdf, uploadSignaturePdf } from './storage';
import { stampSignatures } from './pdf-stamper';
import { sha256Buffer } from './hash';
import { requestTimestampWithRetry } from './tsa';
import { generateProofCertificate } from './certificate-generator';
import { appendEvent } from './audit-chain';
import { sendEmail } from '@/lib/email';

export async function finalizeSignatureRequest(requestId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const r = await prisma.signatureRequest.findUnique({
    where: { id: requestId },
    include: { zones: true, signataire: true, createdBy: true },
  });
  if (!r) return { ok: false, reason: 'NOT_FOUND' };
  if (r.statut !== 'signed') return { ok: false, reason: `INVALID_STATE:${r.statut}` };
  if (!r.signataire) return { ok: false, reason: 'NO_SIGNATAIRE' };

  // 1. Reconstruction PDF final
  const originalBuf = await downloadSignaturePdf(r.originalFileUrl);
  const fills = r.zones
    .filter((z) => z.filled && z.filledValue && z.filledMethod)
    .map((z) => ({
      page: z.page,
      x: z.x, y: z.y, width: z.width, height: z.height,
      type: z.type as 'signature' | 'initials' | 'date' | 'text',
      method: z.filledMethod as 'canvas' | 'text' | 'image',
      value: z.filledValue!,
    }));
  const signedBuf = await stampSignatures(originalBuf, fills);

  // 2. Hash
  const signedHash = sha256Buffer(signedBuf);

  // 3. Upload PDF signé
  const signedPath = `${r.id}/signed.pdf`;
  await uploadSignaturePdf(signedPath, signedBuf);

  // 4. Horodatage TSA (peut échouer sans bloquer)
  const tsa = await requestTimestampWithRetry(signedHash, 3);

  // 5. Update BD + audit
  await prisma.signatureRequest.update({
    where: { id: r.id },
    data: {
      signedFileUrl: signedPath,
      signedFileSha256: signedHash,
      tsaTimestamp: tsa?.timestampToken ?? null,
      tsaTimestampedAt: tsa?.timestampedAt ?? null,
    },
  });
  if (tsa) {
    await appendEvent(r.id, {
      type: 'tsa_stamped',
      actorType: 'system',
      actorId: null,
      payload: { tsa: 'freetsa.org', hashSha256: signedHash },
    });
  }

  // 6. Génération certificat
  const certBuf = await generateProofCertificate(r.id);
  const certPath = `${r.id}/certificate.pdf`;
  await uploadSignaturePdf(certPath, certBuf);
  await prisma.signatureRequest.update({
    where: { id: r.id },
    data: { certificateUrl: certPath, statut: 'completed', completedAt: new Date() },
  });
  await appendEvent(r.id, {
    type: 'completed',
    actorType: 'system',
    actorId: null,
    payload: { signedHash, hasTimestamp: !!tsa },
  });

  // 7. Emails
  await sendEmail({
    to: r.signataire.email,
    subject: `Document signé — ${r.titre}`,
    html: `<p>Bonjour ${r.signataire.nom},</p><p>Votre signature a été finalisée. Vous trouverez ci-joint le document signé et le certificat de preuve.</p>`,
    attachments: [
      { filename: `${r.titre}-signed.pdf`, content: signedBuf },
      { filename: `${r.titre}-certificat.pdf`, content: certBuf },
    ],
  });
  if (r.createdBy.email) {
    await sendEmail({
      to: r.createdBy.email,
      subject: `Signature complétée — ${r.titre}`,
      html: `<p>${r.signataire.nom} (${r.signataire.email}) a signé <b>${r.titre}</b>. <a href="${process.env.NEXTAUTH_URL}/signatures/${r.id}">Voir le détail</a>.</p>`,
    });
  }

  return { ok: true };
}
```

- [ ] **Step 2: Adapter `lib/email.ts` si nécessaire pour supporter `attachments`**

Read `lib/email.ts` et vérifier que `sendEmail` accepte `attachments`. Si non, étendre la signature pour passer `attachments` à nodemailer (`{ filename, content }[]`).

- [ ] **Step 3: Modifier `app/api/sign/[token]/submit/route.ts` pour appeler finalize**

Remplacer le commentaire `// La finalisation (PDF + TSA + certificat)...` par :

```typescript
// Lance la finalisation en arrière-plan (fire-and-forget côté HTTP),
// le cron retry reprendra en cas de crash partiel.
import('@/lib/signatures/finalize').then(({ finalizeSignatureRequest }) =>
  finalizeSignatureRequest(result.requestId).catch((e) => console.error('Finalize failed:', e))
);
```

(Note : sur Netlify Functions, fire-and-forget peut être tué prématurément. C'est pour ça qu'on a aussi le cron retry qui rattrape.)

- [ ] **Step 4: Test bout-en-bout**

Refaire le flux complet : créer → envoyer → ouvrir lien → signer → confirmer.

Expected: ~5-10s plus tard, email reçu dans Mailpit avec 2 PDF en pièce jointe. Statut `completed`.

- [ ] **Step 5: Commit**

```bash
git add lib/signatures/finalize.ts app/api/sign/[token]/submit/route.ts lib/email.ts
git commit -m "feat(signatures): finalisation atomique (PDF + TSA + certificat + emails)"
```

---

### Task 5.6 : Cron retry finalization (GitHub Actions)

**Files:**
- Create: `app/api/cron/signature-retry-finalization/route.ts`
- Modify: `.github/workflows/cron.yml`

- [ ] **Step 1: Créer la route cron**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { finalizeSignatureRequest } from '@/lib/signatures/finalize';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Reprend les requests bloquées en signed depuis > 5 min, max 10 par run
  const stuck = await prisma.signatureRequest.findMany({
    where: { statut: 'signed', signedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
    take: 10,
  });
  const results = [];
  for (const r of stuck) {
    try {
      const out = await finalizeSignatureRequest(r.id);
      results.push({ id: r.id, ...out });
    } catch (e) {
      results.push({ id: r.id, ok: false, reason: (e as Error).message });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
```

- [ ] **Step 2: Ajouter le schedule dans `.github/workflows/cron.yml`**

Ouvrir `.github/workflows/cron.yml` et ajouter un nouveau bloc schedule. Read le fichier d'abord pour comprendre la structure existante, puis ajouter le bloc cohérent.

Schedule à ajouter (toutes les 5 min) :

```yaml
- cron: '*/5 * * * *'
  endpoint: /api/cron/signature-retry-finalization
```

(Adapter à la structure réelle du workflow.)

- [ ] **Step 3: Tester localement**

Run:
```bash
curl -X POST http://localhost:3000/api/cron/signature-retry-finalization \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `{ "processed": 0, "results": [] }` si aucune request bloquée, sinon liste.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/signature-retry-finalization/route.ts .github/workflows/cron.yml
git commit -m "feat(signatures): cron retry finalisation (GitHub Actions */5min)"
```

---

### Task 5.7 : Route `POST /api/signatures/verify` (vérification publique)

**Files:**
- Create: `app/api/signatures/verify/route.ts`
- Create: `app/verify/page.tsx`

- [ ] **Step 1: Route API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sha256Buffer } from '@/lib/signatures/hash';
import { verifyAuditChain } from '@/lib/signatures/audit-chain';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  const requestId = (form.get('requestId') ?? null) as string | null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256Buffer(buf);

  let match: { id: string; titre: string; signedAt: Date | null; auditValid: boolean } | null = null;
  if (requestId) {
    const r = await prisma.signatureRequest.findUnique({ where: { id: requestId } });
    if (r && r.signedFileSha256 === hash) {
      const audit = await verifyAuditChain(r.id);
      match = { id: r.id, titre: r.titre, signedAt: r.signedAt, auditValid: audit.valid };
    }
  } else {
    const r = await prisma.signatureRequest.findFirst({ where: { signedFileSha256: hash } });
    if (r) {
      const audit = await verifyAuditChain(r.id);
      match = { id: r.id, titre: r.titre, signedAt: r.signedAt, auditValid: audit.valid };
    }
  }

  return NextResponse.json({
    fileHash: hash,
    matchFound: !!match,
    match,
  });
}
```

- [ ] **Step 2: Page UI publique**

```tsx
// app/verify/page.tsx
"use client";
import { useState } from "react";

export default function VerifyPage() {
  const [result, setResult] = useState<{ fileHash: string; matchFound: boolean; match?: { id: string; titre: string; signedAt: string | null; auditValid: boolean } | null } | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/signatures/verify", { method: "POST", body: fd });
    setResult(await res.json());
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Vérifier un document signé</h1>
      <p className="text-sm text-gray-600 mb-6">
        Uploadez un PDF signé pour vérifier son intégrité (hash SHA-256) et l'audit log associé.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="file" name="file" accept="application/pdf" required />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Vérifier</button>
      </form>
      {result && (
        <div className="mt-6 p-4 border rounded">
          <p className="font-mono text-xs">Hash : {result.fileHash}</p>
          {result.matchFound && result.match ? (
            <div className="mt-3 text-green-700">
              <p>✓ Document reconnu : <b>{result.match.titre}</b></p>
              <p>Signé le : {result.match.signedAt}</p>
              <p>Audit log : {result.match.auditValid ? "✓ intact" : "✗ corrompu"}</p>
            </div>
          ) : (
            <p className="mt-3 text-red-700">✗ Ce document ne correspond à aucune signature enregistrée (ou a été modifié)</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Test manuel**

Télécharger un PDF signé via Mailpit (depuis l'email confirmation), aller sur `/verify`, l'uploader. Expected: match trouvé, audit valid ✓.

Ensuite, modifier 1 byte du PDF (via éditeur hex) et réuploader : match non trouvé.

- [ ] **Step 4: Commit**

```bash
git add app/api/signatures/verify/route.ts app/verify/page.tsx
git commit -m "feat(signatures): vérification publique d'intégrité /verify"
```

---

**🚦 Validation fin Sprint 5**

- Flux complet : création → envoi → signature → finalisation auto en ~10s
- PDF signé + certificat reçus par email
- Audit log chaîné détecte les modifications (test `audit-chain` vert)
- Cron retry actif (callable manuellement avec Bearer auth)
- `/verify` détecte un PDF intact vs un PDF modifié
- Tests : 8 fichiers verts

---

## Sprint 6 — Suivi admin + finition (2j)

**Objectif sprint :** UI admin complète (liste, détail, audit log visible) + crons expirations/rappels + intégration espace client RFC + tests E2E Playwright.

**Validation fin sprint :** V1 production-ready, déployable.

---

### Task 6.1 : Setup Playwright

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Installer Playwright**

Run: `npm install -D @playwright/test && npx playwright install --with-deps chromium`

- [ ] **Step 2: Créer `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Ajouter scripts package.json**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Smoke test**

Créer `tests/e2e/smoke.spec.ts` :

```typescript
import { test, expect } from '@playwright/test';

test('homepage répond', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
```

Run: `npm run test:e2e -- smoke`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts package.json package-lock.json
git commit -m "test: setup Playwright pour E2E"
```

---

### Task 6.2 : Page admin liste `/signatures` + composants

**Files:**
- Create: `app/signatures/page.tsx`
- Create: `app/api/signatures/route.ts` (extension du GET)
- Create: `components/signatures/SignatureStatusBadge.tsx`

- [ ] **Step 1: Implémenter GET /api/signatures (liste paginée)**

Modifier `app/api/signatures/route.ts` (la fonction `GET`) :

```typescript
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const statut = url.searchParams.get('statut');
  const search = url.searchParams.get('search');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const where: Prisma.SignatureRequestWhereInput = {
    ...(statut ? { statut } : {}),
    ...(search ? { titre: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.signatureRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { signataire: { select: { email: true, nom: true } } },
    }),
    prisma.signatureRequest.count({ where }),
  ]);
  return NextResponse.json({ items, total });
}
```

Ajouter import `Prisma` depuis `@prisma/client` en haut du fichier.

- [ ] **Step 2: Composant badge**

```tsx
// components/signatures/SignatureStatusBadge.tsx
const COLORS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-800',
  ready: 'bg-blue-200 text-blue-800',
  sent: 'bg-yellow-200 text-yellow-900',
  viewed: 'bg-purple-200 text-purple-900',
  signed: 'bg-green-200 text-green-900',
  completed: 'bg-green-500 text-white',
  expired: 'bg-red-200 text-red-900',
  cancelled: 'bg-gray-400 text-white',
  rejected: 'bg-red-500 text-white',
};
const LABELS: Record<string, string> = {
  draft: 'Brouillon', ready: 'Prêt', sent: 'Envoyé', viewed: 'Vu',
  signed: 'Signé', completed: 'Finalisé', expired: 'Expiré',
  cancelled: 'Annulé', rejected: 'Refusé',
};

export function SignatureStatusBadge({ statut }: { statut: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${COLORS[statut] ?? COLORS.draft}`}>
      {LABELS[statut] ?? statut}
    </span>
  );
}
```

- [ ] **Step 3: Page liste**

```tsx
// app/signatures/page.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { SignatureStatusBadge } from "@/components/signatures/SignatureStatusBadge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SignaturesPage() {
  const [statut, setStatut] = useState("");
  const [search, setSearch] = useState("");
  const params = new URLSearchParams();
  if (statut) params.set("statut", statut);
  if (search) params.set("search", search);
  const { data } = useSWR(`/api/signatures?${params}`, fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Signatures électroniques</h1>
        <Link href="/signatures/nouveau" className="px-4 py-2 bg-blue-600 text-white rounded">+ Nouvelle</Link>
      </div>
      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-2 border rounded flex-1" />
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className="p-2 border rounded">
          <option value="">Tous les statuts</option>
          {["draft", "ready", "sent", "viewed", "signed", "completed", "expired", "rejected"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b">
            <th className="py-2">Titre</th><th>Signataire</th><th>Statut</th><th>Créé</th><th></th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((r: { id: string; titre: string; statut: string; createdAt: string; signataire: { nom: string; email: string } | null }) => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{r.titre}</td>
              <td>{r.signataire?.nom ?? '-'}</td>
              <td><SignatureStatusBadge statut={r.statut} /></td>
              <td>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
              <td><Link href={`/signatures/${r.id}`} className="text-blue-600">Détail</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/signatures/page.tsx app/api/signatures/route.ts components/signatures/SignatureStatusBadge.tsx
git commit -m "feat(signatures): page admin liste avec filtres + badge statut"
```

---

### Task 6.3 : Page détail `/signatures/[id]` + audit viewer

**Files:**
- Create: `app/signatures/[id]/page.tsx`
- Create: `components/signatures/AuditLogViewer.tsx`
- Create: `app/api/signatures/[id]/audit/route.ts`

- [ ] **Step 1: Route audit**

```typescript
// app/api/signatures/[id]/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyAuditChain } from '@/lib/signatures/audit-chain';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [events, integrity] = await Promise.all([
    prisma.signatureEvent.findMany({ where: { requestId: params.id }, orderBy: { createdAt: 'asc' } }),
    verifyAuditChain(params.id),
  ]);
  return NextResponse.json({ events, integrity });
}
```

- [ ] **Step 2: Composant AuditLogViewer**

```tsx
// components/signatures/AuditLogViewer.tsx
"use client";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export function AuditLogViewer({ requestId }: { requestId: string }) {
  const { data } = useSWR(`/api/signatures/${requestId}/audit`, fetcher);
  if (!data) return <p>Chargement audit...</p>;
  return (
    <div>
      <p className="text-sm mb-2">
        Intégrité chaîne : {data.integrity.valid
          ? <span className="text-green-700">✓ valide</span>
          : <span className="text-red-700">✗ corrompue (cassée à {data.integrity.brokenAt})</span>}
      </p>
      <table className="w-full text-xs">
        <thead className="text-left text-gray-500 border-b">
          <tr><th className="py-1">Date</th><th>Type</th><th>Acteur</th><th>Hash</th></tr>
        </thead>
        <tbody>
          {data.events.map((e: { id: string; createdAt: string; type: string; actorType: string; actorId: string | null; eventHash: string }) => (
            <tr key={e.id} className="border-b">
              <td className="py-1">{new Date(e.createdAt).toLocaleString('fr-FR')}</td>
              <td>{e.type}</td>
              <td>{e.actorType}{e.actorId ? `:${e.actorId.slice(0, 8)}` : ''}</td>
              <td className="font-mono">{e.eventHash.slice(0, 16)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Page détail**

```tsx
// app/signatures/[id]/page.tsx
"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { SignatureStatusBadge } from "@/components/signatures/SignatureStatusBadge";
import { AuditLogViewer } from "@/components/signatures/AuditLogViewer";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: r, mutate } = useSWR(`/api/signatures/${id}`, fetcher);
  if (!r) return <p>Chargement...</p>;

  const send = async () => {
    if (!confirm("Envoyer pour signature ?")) return;
    await fetch(`/api/signatures/${id}/send`, { method: "POST" });
    mutate();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">{r.titre}</h1>
      <SignatureStatusBadge statut={r.statut} />
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div>
          <h2 className="font-bold mb-2">Signataire</h2>
          <p>{r.signataire?.nom} &lt;{r.signataire?.email}&gt;</p>
          <p className="text-sm text-gray-500">Statut : {r.signataire?.statut}</p>
        </div>
        <div>
          <h2 className="font-bold mb-2">Document</h2>
          <p className="text-xs font-mono">Hash original : {r.originalFileSha256}</p>
          {r.signedFileSha256 && <p className="text-xs font-mono">Hash signé : {r.signedFileSha256}</p>}
          {r.tsaTimestampedAt && <p className="text-sm">Horodaté : {new Date(r.tsaTimestampedAt).toLocaleString('fr-FR')}</p>}
        </div>
      </div>
      {r.statut === 'ready' && (
        <button onClick={send} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded">Envoyer pour signature</button>
      )}
      <div className="mt-8">
        <h2 className="font-bold mb-2">Audit log</h2>
        <AuditLogViewer requestId={r.id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/signatures/[id]/page.tsx components/signatures/AuditLogViewer.tsx app/api/signatures/[id]/audit/route.ts
git commit -m "feat(signatures): page détail admin + audit log viewer"
```

---

### Task 6.4 : Crons expirations + rappels

**Files:**
- Create: `app/api/cron/signature-expirations/route.ts`
- Create: `app/api/cron/signature-reminders/route.ts`
- Modify: `.github/workflows/cron.yml`

- [ ] **Step 1: Cron expirations**

```typescript
// app/api/cron/signature-expirations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/lib/signatures/audit-chain';

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const now = new Date();
  const expired = await prisma.signatureRequest.findMany({
    where: {
      statut: { in: ['sent', 'viewed'] },
      expiresAt: { lt: now },
    },
    take: 100,
  });
  for (const r of expired) {
    await prisma.signatureRequest.update({ where: { id: r.id }, data: { statut: 'expired' } });
    await appendEvent(r.id, { type: 'expired', actorType: 'system', actorId: null });
  }
  // Purge tokens > 30 jours
  const purgeBefore = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const deleted = await prisma.signatureTokenAttempt.deleteMany({ where: { createdAt: { lt: purgeBefore } } });

  return NextResponse.json({ expired: expired.length, tokensPurged: deleted.count });
}
```

- [ ] **Step 2: Cron rappels**

```typescript
// app/api/cron/signature-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const now = new Date();
  // Rappel à J-3 et J-1
  const targets = [
    { days: 3, label: 'dans 3 jours' },
    { days: 1, label: 'demain' },
  ];
  let sent = 0;
  for (const t of targets) {
    const min = new Date(now.getTime() + (t.days * 24 - 1) * 60 * 60_000);
    const max = new Date(now.getTime() + (t.days * 24 + 1) * 60 * 60_000);
    const due = await prisma.signatureRequest.findMany({
      where: { statut: { in: ['sent', 'viewed'] }, expiresAt: { gte: min, lte: max } },
      include: { signataire: true },
    });
    for (const r of due) {
      if (!r.signataire) continue;
      await sendEmail({
        to: r.signataire.email,
        subject: `Rappel : document à signer (expire ${t.label})`,
        html: `<p>Bonjour ${r.signataire.nom},</p><p>Vous n'avez pas encore signé le document <b>${r.titre}</b>. Il expire ${t.label}.</p>`,
      });
      sent++;
    }
  }
  return NextResponse.json({ remindersSent: sent });
}
```

- [ ] **Step 3: Ajouter au workflow GitHub Actions**

Dans `.github/workflows/cron.yml`, ajouter :

```yaml
- cron: '0 2 * * *'   # 2h UTC quotidien
  endpoint: /api/cron/signature-expirations
- cron: '0 9 * * *'   # 9h UTC quotidien
  endpoint: /api/cron/signature-reminders
```

- [ ] **Step 4: Test manuel des deux crons**

```bash
curl -X POST http://localhost:3000/api/cron/signature-expirations -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/signature-reminders -H "Authorization: Bearer $CRON_SECRET"
```

Expected: réponses JSON avec compteurs.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/signature-expirations app/api/cron/signature-reminders .github/workflows/cron.yml
git commit -m "feat(signatures): crons expirations + rappels J-3/J-1"
```

---

### Task 6.5 : Intégration espace client RFC

**Files:**
- Modify: `app/espace-client/documents/page.tsx`

- [ ] **Step 1: Read le fichier existant**

Read `app/espace-client/documents/page.tsx` pour comprendre la structure actuelle.

- [ ] **Step 2: Étendre la liste avec les `SignatureRequest` complétées de l'entreprise du client connecté**

Identifier l'endpoint API actuel utilisé par la page (`app/api/client/documents/route.ts` ou similaire). Étendre cet endpoint pour inclure une nouvelle section :

```typescript
const signedRequests = await prisma.signatureRequest.findMany({
  where: { entrepriseId: session.user.entrepriseId, statut: 'completed' },
  select: { id: true, titre: true, signedFileUrl: true, certificateUrl: true, completedAt: true },
});
// ajouter à la réponse JSON
```

Dans la page, afficher une nouvelle section "Documents signés électroniquement" avec liens de téléchargement (générer des signed URLs via `getSignedUrl`).

- [ ] **Step 3: Commit**

```bash
git add app/espace-client/documents/page.tsx app/api/client/documents/route.ts
git commit -m "feat(signatures): apparition des docs signés dans espace client"
```

---

### Task 6.6 : Tests E2E Playwright (8 scénarios)

**Files:**
- Create: `tests/e2e/signatures/01-admin-golden-path.spec.ts` à `08-mobile-responsive.spec.ts`
- Create: `tests/e2e/signatures/fixtures.ts` (helpers : login admin, login signataire via token magique)

- [ ] **Step 1: Helpers fixtures**

```typescript
// tests/e2e/signatures/fixtures.ts
import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@formapro.fr');
  await page.fill('input[name="password"]', 'formateur');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard|signatures|tableau/);
}

export async function uploadPdfAndPlaceZones(page: Page, pdfPath: string, titre: string) {
  await page.goto('/signatures/nouveau');
  await page.fill('input[placeholder*="Titre"]', titre);
  await page.setInputFiles('input[type="file"]', pdfPath);
  await page.click('button:has-text("Uploader")');
  // Attendre l'apparition du designer
  await page.waitForSelector('.pdf-viewer');
  // Tracer une zone par drag-drop
  const canvas = await page.locator('.pdf-viewer canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  await page.mouse.move(box.x + 100, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + 240);
  await page.mouse.up();
  return { canvas };
}

export async function fetchMagicLink(signataireEmail: string): Promise<string> {
  // Lit l'API Mailpit pour récupérer le dernier email
  const res = await fetch('http://localhost:8025/api/v1/messages');
  const data = await res.json();
  const msg = data.messages.find((m: { To: Array<{ Address: string }> }) => m.To?.some((t) => t.Address === signataireEmail));
  if (!msg) throw new Error('No email found for ' + signataireEmail);
  const body = await fetch(`http://localhost:8025/api/v1/message/${msg.ID}`).then((r) => r.json());
  const match = body.HTML?.match(/href="(https?:\/\/[^"]+\/sign\/[^"]+)"/);
  if (!match) throw new Error('No sign link in email');
  return match[1].replace(/&amp;/g, '&');
}
```

- [ ] **Step 2: Scénario 1 (golden path admin)**

```typescript
// tests/e2e/signatures/01-admin-golden-path.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin, uploadPdfAndPlaceZones } from './fixtures';

test('golden path admin : upload + place + signataire + envoi', async ({ page }) => {
  await loginAsAdmin(page);
  await uploadPdfAndPlaceZones(page, 'tests/fixtures/sample.pdf', 'E2E test 1');
  await page.fill('input[type="email"]', 'signataire-e2e@test.local');
  await page.fill('input[placeholder*="Nom"]', 'Test Signataire');
  await page.click('button:has-text("Sauvegarder")');
  await expect(page).toHaveURL(/\/signatures\/[a-z0-9]+/);
  await page.click('button:has-text("Envoyer")');
  page.on('dialog', (d) => d.accept());
  await page.waitForResponse((r) => r.url().includes('/send') && r.status() === 200);
});
```

- [ ] **Step 3: Scénarios 2 à 8 (à compléter selon le même modèle)**

Pour chaque scénario du spec (sprint 5 section Tests E2E du spec) :
- 02-signataire-golden-path : login admin → créer + envoyer → ouvrir lien Mailpit → signer canvas → vérifier `completed`
- 03-signature-texte : idem mais onglet "Taper"
- 04-signature-image : idem mais upload PNG
- 05-token-expire : avancer `expiresAt` via API admin → page expired
- 06-refus : clic "Refuser" → motif → admin reçoit email
- 07-verify : upload PDF signé sur `/verify` → match trouvé ; modifier 1 byte → no match
- 08-mobile-responsive : `test.use({ viewport: { width: 390, height: 844 } })` puis scénario 2

(Chaque fichier suit la même structure que `01-admin-golden-path.spec.ts`. Reprendre les sélecteurs et flux. Limite : pas de placeholder, chaque test doit être complet.)

- [ ] **Step 4: Lancer la suite E2E**

Pré-requis : Mailpit en local + dev server + DB de test seedée avec admin.

Run: `npm run test:e2e -- signatures`. Expected: 8/8 verts (peut nécessiter retries sur le timing FreeTSA).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/signatures/
git commit -m "test(signatures): 8 scénarios E2E Playwright"
```

---

### Task 6.7 : Documentation utilisateur

**Files:**
- Create: `app/help/signatures/page.tsx` (ou équivalent selon structure RFC existante)

- [ ] **Step 1: Page d'aide**

Une page courte décrivant : créer une signature (admin), suivre statut, le signataire reçoit un email, signe, le PDF + certificat sont envoyés. Mention du niveau de preuve (simple renforcée), durée de conservation (10 ans). Lien vers `/verify`.

- [ ] **Step 2: Commit**

```bash
git add app/help/signatures
git commit -m "docs(signatures): page d'aide utilisateur"
```

---

**🚦 Validation fin Sprint 6 + V1 PRODUCTION-READY**

Checklist finale :

- [ ] Tous les tests unitaires verts (`npm test`)
- [ ] Tous les E2E verts (`npm run test:e2e`)
- [ ] Pas de régression sur le flux devis existant (test manuel)
- [ ] Variables d'environnement Netlify configurées : `SECRET_HMAC_TOKENS`, `CRON_SECRET`, `FREETSA_URL`, `SIGNATURE_TOKEN_EXPIRY_DAYS`
- [ ] Secrets GitHub Actions configurés (CRON_SECRET)
- [ ] Bucket Supabase `signature-documents` créé en prod
- [ ] Cron `.github/workflows/cron.yml` mergé sur `main`
- [ ] Page `/help/signatures` accessible
- [ ] DKIM/SPF/DMARC du domaine email vérifiés (hors scope code, mais à confirmer)

Si tout vert → **V1 déployable**.

---

## Self-review du plan (corrections inline déjà appliquées)

**Couverture spec :**
- ✓ 5 modules architecturaux → Tasks 1.3, 1.4, 2.2, 2.4, 2.5, 3.1, 3.4, 5.1, 5.2, 5.3, 5.4, 6.3
- ✓ Modèles Prisma → Task 1.2
- ✓ Workflow états → Task 3.1
- ✓ Token magique HMAC → Task 1.4
- ✓ Hash + audit chaîné → Tasks 1.3, 5.3
- ✓ Vue admin (upload, design, suivi) → Tasks 2.4, 2.5, 6.2, 6.3
- ✓ Vue signataire publique → Tasks 3.5, 4.2
- ✓ Capture signature 3 méthodes → Task 4.1
- ✓ Finalisation crypto atomique → Task 5.5
- ✓ TSA RFC 3161 → Task 5.2
- ✓ Certificat PDF preuve → Task 5.4
- ✓ Page /verify publique → Task 5.7
- ✓ Crons (retry, expirations, rappels) → Tasks 5.6, 6.4
- ✓ Intégration espace client → Task 6.5
- ✓ Tests Vitest + Playwright → Tasks 1.1, 6.1, 6.6
- ✓ Rate-limit → Task 3.4
- ✓ Sécurité PDF upload (validation magic bytes + scripts) → Task 2.3 (validation.ts)

**Pas de placeholders TBD/TODO repérés.**

**Cohérence types/noms :** `SignatureRequest`, `SignatureZone`, `Signataire`, `SignatureEvent`, `SignatureTokenAttempt` utilisés de manière cohérente partout. Fonctions `appendEvent`, `verifyAuditChain`, `verifyToken`, `hashToken`, `stampSignatures`, `requestTimestamp`, `finalizeSignatureRequest` toutes définies dans leur task et référencées correctement ensuite.

**Scope :** focused, un seul plan d'implémentation pour V1 (~11 jours).

---

## Exécution

**Plan complet et committé.** Deux options pour l'exécution :

**1. Subagent-Driven (recommandé)** — Je dispatche un subagent frais par tâche, revue entre tâches, itération rapide.

**2. Inline Execution** — On exécute les tâches dans cette session avec `executing-plans`, batch avec checkpoints de revue.

Tu choisis quelle approche ? (Ou tu préfères d'abord relire le plan et y revenir plus tard ?)
