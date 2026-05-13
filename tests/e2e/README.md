# Tests E2E — Playwright

## Lancer

```bash
# Installation des navigateurs (premier run uniquement)
npx playwright install --with-deps chromium

# Tests headless
npm run test:e2e

# UI interactive (debug)
npm run test:e2e:ui

# Voir le rapport HTML après un run
npm run test:e2e:report
```

Le serveur Next.js démarre automatiquement (cf `webServer` dans
`playwright.config.ts`). Si `npm run dev` tourne déjà sur le port 3000,
Playwright réutilise la même instance.

## Configurer une autre URL

```bash
PLAYWRIGHT_BASE_URL=https://deploy-preview-42--projetrfc.netlify.app npm run test:e2e
```

Quand `PLAYWRIGHT_BASE_URL` est définie, Playwright **ne démarre pas** de
serveur local — utile pour tester un deploy preview Netlify.

## Périmètre actuel

Tests d'**accès public** uniquement : page de login, redirects pour
utilisateurs non authentifiés. Pas de scénarios authentifiés tant qu'on
n'a pas de stratégie de seed DB pour les E2E.

## Roadmap (sprints suivants)

- Seed DB E2E (admin + formateur + client par défaut) via script
- Storage state (cookies / Supabase session) par rôle
- Tests métier : création devis → signature → facture
- Tests émargement (signature canvas + PDF)
- Tests RGPD (demande export, suppression)
