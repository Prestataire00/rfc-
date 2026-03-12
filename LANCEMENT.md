# FormaPro CRM - Guide de lancement

## Prérequis
- Node.js 18+ (installer via https://nodejs.org ou `brew install node`)
- npm ou pnpm

## Lancement en 4 étapes

```bash
# 1. Aller dans le dossier du projet
cd crm-formation

# 2. Installer les dépendances
npm install

# 3. Initialiser la base de données et charger les données de démo
npx prisma migrate dev --name init
npm run db:seed

# 4. Lancer l'application
npm run dev
```

Ouvrir **http://localhost:3000** dans votre navigateur.

## Commandes utiles

```bash
npm run dev          # Démarrer en développement
npm run build        # Build de production
npm run db:studio    # Ouvrir Prisma Studio (interface BDD visuelle)
npm run db:seed      # Réinitialiser les données de démo
```

## Structure du CRM

| Module | URL | Description |
|--------|-----|-------------|
| Tableau de bord | /dashboard | KPIs et aperçu général |
| Contacts | /contacts | Clients, prospects, stagiaires |
| Entreprises | /entreprises | Entreprises clientes |
| Formations | /formations | Catalogue de formations |
| Sessions | /sessions | Planning des sessions + calendrier |
| Formateurs | /formateurs | Profils et disponibilités |
| Commercial | /commercial | Pipeline devis + factures |
