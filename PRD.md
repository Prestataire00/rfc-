# Product Requirements Document
## FormaPro CRM — RFC Rescue Formation Conseil

**Version** : 1.0
**Date** : Avril 2026
**Statut** : Production
**URL** : https://projetrfc.netlify.app

---

## 1. Contexte & Problème

RFC Rescue Formation Conseil est un organisme de formation spécialisé en sécurité, incendie et prévention. Avant ce projet, la gestion des formations, clients, devis et documents était dispersée entre plusieurs outils (tableurs, emails, logiciels non connectés).

**Problèmes à résoudre :**
- Pas de suivi centralisé des stagiaires et entreprises clientes
- Gestion manuelle des devis et factures, sans lien entre eux
- Aucun envoi automatique des questionnaires de satisfaction
- Documents pédagogiques (convocations, attestations, feuilles de présence) générés à la main
- Suivi Qualiopi non outillé
- Pas de portail pour les formateurs ou les clients

---

## 2. Objectifs Produit

| Objectif | Indicateur de succès |
|----------|---------------------|
| Centraliser la gestion clients & formations | 100% des sessions créées dans le CRM |
| Automatiser la facturation | Facture générée en 1 clic depuis un devis accepté |
| Automatiser les évaluations | Envoi automatique à la fin de chaque session |
| Outiller la conformité Qualiopi | Suivi des 32 indicateurs dans l'outil |
| Offrir des portails autonomes | Formateurs et clients accèdent à leurs données sans solliciter l'admin |

---

## 3. Utilisateurs Cibles

### 3.1 Admin (RFC)
Responsable de l'organisme. Accès complet à toutes les fonctionnalités.

### 3.2 Formateur
Intervenant externe ou interne. Accès à son planning, ses sessions, ses disponibilités, ses documents et les feedbacks.

### 3.3 Client (Entreprise)
Contact référent d'une entreprise cliente. Accès à ses formations, stagiaires, devis, documents et évaluations.

---

## 4. Périmètre Fonctionnel

### 4.1 Gestion des contacts & entreprises

**Entreprises**
- Fiche entreprise : nom, SIRET, adresse, secteur, téléphone, email, site
- Tunnel CA intégré : Devis en cours → Facturé → Encaissé
- Onglets : informations, contacts, devis, factures

**Contacts / Stagiaires**
- Fiche contact : nom, prénom, email, téléphone, poste, type (prospect / client / stagiaire)
- Rattachement à une entreprise
- Historique des inscriptions

---

### 4.2 Catalogue formations & sessions

**Formations**
- Titre, description, durée (heures), tarif, niveau, prérequis, objectifs
- Catégorie, certification, code RNCP
- Statut actif/inactif

**Sessions**
- Planification : dates, lieu, capacité max, statut
- Assignation d'un formateur
- Gestion des inscriptions (confirmation, présence, absence, annulation)
- Lien d'inscription public (token unique)
- Feuilles de présence (matin / après-midi)
- Documents liés (conventions, convocations, attestations)

**Statuts de session** : Planifiée → Confirmée → En cours → Terminée → Annulée

---

### 4.3 Commercial

**Devis**
- Pipeline Kanban (Brouillon → Envoyé → Accepté → Refusé → Expiré)
- Lignes de devis : désignation, quantité, prix unitaire HT, montant HT
- Calcul automatique HT / TVA / TTC
- Export PDF (layout professionnel : logo, encadrés client/émetteur, tableau TVA, signature)
- Génération de facture en 1 clic depuis un devis accepté

**Factures**
- Générées depuis un devis (montants reportés automatiquement)
- Statuts : En attente → Envoyée → Payée → En retard → Annulée
- Marquage "Payée" avec date de paiement
- Export PDF (même layout professionnel)
- Lien devis → facture visible dans les deux sens

**Tunnel CA global** (page commercial & page entreprise)
```
Devis en cours  →  Facturé à encaisser  →  Encaissé
```

**Besoins formations**
- Pipeline CRM : Nouveau → Qualifié → Devis envoyé → Accepté → Refusé → Archivé
- Priorité, budget, nb stagiaires souhaités
- Lien vers devis et formation correspondante

---

### 4.4 Documents pédagogiques (PDF)

Tous les documents incluent : logo RFC, coordonnées société, **bloc signature + date** pour chaque partie.

| Document | Destinataire | Contenu |
|----------|-------------|---------|
| Convention de formation | Entreprise | Objet, durée, dates, conditions financières |
| Convocation | Stagiaire | Infos session, horaires, accusé de réception |
| Feuille de présence | Formateur | Émargement matin/après-midi par stagiaire |
| Attestation de fin de formation | Stagiaire | Formation suivie, durée, dates, signature directeur |
| Devis PDF | Client | Lignes, TVA, totaux, conditions, signature |
| Facture PDF | Client | Idem devis + référence devis, échéance |

---

### 4.5 Évaluations & satisfaction

**Questionnaire à chaud** (envoyé automatiquement quand session → Terminée)
- Section 1 : Contenu & Objectifs (3 questions)
- Section 2 : Pédagogie & Formateur (3 questions)
- Section 3 : Organisation & Logistique (3 questions)
- Note globale (1 à 5 étoiles) + commentaire libre

**Questionnaire à froid** (J+21, cron automatique 8h)
- Section 1 : Mise en pratique (3 questions)
- Section 2 : Appréciation générale (3 questions)

**Accès** : lien unique par token (aucun compte requis)

**Page publique** : wizard multi-étapes, barre de progression, étoiles avec labels, page de confirmation

**Feedback formateur** : note globale, commentaires sur conditions matérielles, dynamique de groupe, suggestions

---

### 4.6 Qualiopi

- Suivi des 32 indicateurs répartis sur 7 critères
- Statut par indicateur : Conforme / En cours / Non conforme / Non applicable
- Preuves jointes (documents, processus, enregistrements)
- Indicateurs prioritaires marqués
- Date d'audit, commentaires

---

### 4.7 BPF — Bilan Pédagogique et Financier

- Calcul automatique annuel : sessions, stagiaires, heures, CA HT
- Détail par session (formation, dates, nb inscrits, durée, CA)
- Répartition par catégorie de formation
- Export PDF conforme (logo RFC, stats, tableau sessions)

---

### 4.8 Portail Formateur (`/espace-formateur`)

| Section | Contenu |
|---------|---------|
| Planning | Calendrier de mes sessions |
| Sessions | Détail, stagiaires, feuilles de présence |
| Disponibilités | Déclaration des créneaux disponibles/indisponibles |
| Documents | CV, contrats, documents liés à mes sessions |
| Feedbacks | Mes retours de formation |
| Attestations | Attestations des stagiaires à valider |

---

### 4.9 Portail Client (`/espace-client`)

| Section | Contenu |
|---------|---------|
| Formations | Mes sessions et inscriptions |
| Stagiaires | Liste de mes collaborateurs inscrits |
| Documents | Conventions, convocations, attestations |
| Devis | Mes devis en cours et signés |
| Évaluations | Résultats de satisfaction |

---

### 4.10 Gestion des utilisateurs

- Création de comptes (admin, formateur, client)
- Liaison formateur → compte formateur
- Liaison client → entreprise
- Réinitialisation de mot de passe
- Activation / désactivation

---

### 4.11 Paramètres globaux

- Informations de l'organisme : nom, slogan, adresse, tel, email, SIRET, NDA, N°TVA
- Utilisées automatiquement dans tous les PDF
- Conditions de paiement, mentions légales devis/facture
- Configuration SMTP (envoi emails)

---

### 4.12 Notifications in-app

- Alertes : sessions à venir, devis expirés, factures en retard
- Types : info, succès, avertissement, erreur
- Lien vers la ressource concernée
- Marquage lu/non-lu

---

## 5. Architecture Technique

### 5.1 Stack

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| Style | Tailwind CSS |
| Base de données | PostgreSQL (Supabase) |
| ORM | Prisma 5 |
| Authentification | NextAuth v4 (credentials) |
| PDF | pdfmake 0.2 |
| Email | Nodemailer (SMTP configurable) |
| Hébergement | Netlify (serverless) |
| Dépôt | GitHub (Prestataire00/rfc-) |

### 5.2 Modèle de données

```
User ──────────── Formateur
     └─────────── Entreprise

Entreprise ─────── Contact
           ─────── Devis ──── LigneDevis
           ─────── Facture ─── Devis
           ─────── BesoinFormation
           ─────── Financement
           ─────── Document

Formation ─────── Session ─── Inscription ── Contact
                        ├──── Evaluation
                        ├──── Attestation
                        ├──── FeuillePresence
                        ├──── FeedbackFormateur
                        └──── Document

Formateur ─────── Session
          ─────── Disponibilite
          ─────── Document

IndicateurQualiopi ── PreuveQualiopi

User ──────────── Notification
Parametres (singleton)
```

### 5.3 Authentification & Autorisation

| Rôle | Accès |
|------|-------|
| `admin` | Toutes les pages et API |
| `formateur` | `/espace-formateur/*` + API `/api/formateur/*` |
| `client` | `/espace-client/*` + API `/api/client/*` |

Middleware Next.js sur toutes les routes protégées.

### 5.4 Automatisations

| Déclencheur | Action |
|-------------|--------|
| Session → `terminee` | Génération tokens + envoi email satisfaction à chaud |
| Cron quotidien 8h (Netlify) | Envoi satisfaction à froid J+21 |
| Devis accepté | Génération facture en 1 clic |

---

## 6. Routes API

| Préfixe | Description |
|---------|-------------|
| `/api/formations` | CRUD formations |
| `/api/sessions` | CRUD sessions + inscriptions |
| `/api/contacts` | CRUD contacts |
| `/api/entreprises` | CRUD entreprises |
| `/api/formateurs` | CRUD formateurs |
| `/api/devis` | CRUD devis + génération facture |
| `/api/factures` | CRUD factures |
| `/api/besoins` | CRUD besoins formations |
| `/api/evaluations` | CRUD + génération tokens + soumission publique |
| `/api/bpf` | Calcul BPF + export PDF |
| `/api/qualiopi` | CRUD indicateurs + preuves |
| `/api/documents` | GED |
| `/api/pdf/*` | Génération PDF (devis, facture, convention, attestation, convocation, feuille présence) |
| `/api/email/*` | Envoi emails (convocation, évaluation, devis) |
| `/api/utilisateurs` | CRUD comptes |
| `/api/parametres` | Config organisme |
| `/api/notifications` | Alertes in-app |
| `/api/dashboard/stats` | KPIs dashboard |
| `/api/cron/evaluations` | Cron satisfaction à froid |
| `/api/client/*` | API portail client |
| `/api/formateur/*` | API portail formateur |

---

## 7. Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@formapro.fr | admin123 | Admin |
| formateur@formapro.fr | formateur123 | Formateur |
| client@formapro.fr | client123 | Client |

---

## 8. Roadmap & Évolutions possibles

| Priorité | Fonctionnalité |
|----------|---------------|
| Haute | Signature électronique (devis, convention) |
| Haute | Module CPF / financement OPCO automatisé |
| Moyenne | Application mobile formateur (émargement numérique) |
| Moyenne | Intégration agenda Google/Outlook |
| Moyenne | Tableau de bord analytique avancé (graphes CA, taux remplissage) |
| Basse | Marketplace formations (page publique catalogue) |
| Basse | Chatbot IA assistant pédagogique |
| Basse | Multi-organismes (mode SaaS) |

---

## 9. Contraintes & Décisions techniques

| Décision | Justification |
|----------|--------------|
| Next.js App Router | SSR/SSG + API routes dans un seul projet |
| Supabase PostgreSQL | Hébergement managé, backups automatiques, accès direct |
| pdfmake côté serveur | Génération PDF sans navigateur, compatible serverless |
| NextAuth credentials | Authentification simple sans OAuth externe requis |
| Netlify | Déploiement continu depuis GitHub, crons natifs |
| Prisma | Migrations typées, client généré, compatible edge |

---

*Document généré le 01/04/2026 — RFC Rescue Formation Conseil*
