# Product Requirements Document — RFC Formations (FormaPro CRM)

**Auteur** : Ismael Lepennec
**Date** : 2026-05-16
**Projet** : RFC Formations (web-app, Level 2)
**Version** : 1.0 (rétroactif sur v1 livrée)
**Sources** : [PRD.md](../PRD.md) (avril 2026), [product-brief-rfc-formations-2026-05-16.md](product-brief-rfc-formations-2026-05-16.md)

---

## 1. Objectifs business

Repris du product brief §5 :

1. **Centraliser** la gestion clients & formations → 100 % des sessions créées dans le CRM
2. **Automatiser** la facturation → facture générée en 1 clic depuis un devis accepté
3. **Automatiser** les évaluations → envoi automatique à la fin de chaque session
4. **Outiller** la conformité Qualiopi → suivi des 32 indicateurs + preuves
5. **Offrir** des portails autonomes formateur & client

---

## 2. Personas

| Persona | Description | Accès |
|---------|-------------|-------|
| **Admin RFC** | Responsable de l'organisme, gère l'ensemble de l'activité au quotidien | Toutes les pages et API |
| **Formateur** | Intervenant interne ou externe assurant la livraison pédagogique | `/espace-formateur/*` + `/api/formateur/*` |
| **Client (entreprise)** | Contact référent d'une entreprise cliente, supervise les inscriptions de ses collaborateurs | `/espace-client/*` + `/api/client/*` |
| **Stagiaire** | Utilisateur final d'une session ; accès léger sans compte, via lien tokenisé | Inscription publique, questionnaires de satisfaction |

---

## 3. Parcours utilisateurs clés

1. **Vente formation → encaissement**
   Besoin formation (CRM) → devis (Kanban) → envoi PDF → acceptation → facture en 1 clic → marquage payée → tunnel CA mis à jour.

2. **Planification → livraison → évaluation**
   Création session → assignation formateur → inscriptions stagiaires → génération convocations/conventions PDF → tenue session → feuilles de présence → statut "Terminée" → envoi automatique questionnaire à chaud → J+21 envoi automatique questionnaire à froid → attestations.

3. **Audit Qualiopi**
   Saisie continue des 32 indicateurs avec preuves jointes → consultation centralisée à l'approche de l'audit → export documentaire.

---

## 4. Functional Requirements (FRs)

> Toutes les FRs ci-dessous correspondent à des capacités **livrées en v1**. Priorité **Must Have** pour toutes (post-launch), ré-évaluables en cas de v2.

### FR-001 : Gestion des entreprises et contacts

**Priorité** : Must Have

**Description** :
Le système permet la création, consultation, modification et suppression des fiches entreprises (nom, SIRET, adresse, secteur, coordonnées) et des contacts (nom, prénom, email, téléphone, poste, type prospect/client/stagiaire). Les contacts sont rattachables à une entreprise.

**Critères d'acceptation** :
- [ ] Une fiche entreprise affiche ses contacts associés, devis, factures
- [ ] Un contact peut être rattaché ou détaché d'une entreprise
- [ ] L'historique des inscriptions d'un contact est consultable

---

### FR-002 : Catalogue de formations

**Priorité** : Must Have

**Description** :
Le système gère un catalogue de formations avec titre, description, durée (heures), tarif, niveau, prérequis, objectifs, catégorie, certification, code RNCP et statut actif/inactif.

**Critères d'acceptation** :
- [ ] Une formation peut être créée, modifiée, archivée (statut inactif)
- [ ] Les formations actives sont sélectionnables lors de la création d'une session

---

### FR-003 : Planification et gestion des sessions

**Priorité** : Must Have

**Description** :
Le système permet de planifier des sessions (dates, lieu, capacité max, statut), d'assigner un formateur, de gérer les inscriptions (confirmation, présence, absence, annulation), de générer un lien d'inscription public à token unique, et de tenir les feuilles de présence matin/après-midi.

**Critères d'acceptation** :
- [ ] Une session suit les statuts : Planifiée → Confirmée → En cours → Terminée → Annulée
- [ ] Le lien public d'inscription est unique et ne nécessite pas de compte
- [ ] La capacité max bloque les inscriptions supplémentaires

**Dépendances** : FR-001, FR-002

---

### FR-004 : Pipeline de besoins formations

**Priorité** : Must Have

**Description** :
Le système gère un pipeline CRM des besoins formations exprimés par les entreprises (Nouveau → Qualifié → Devis envoyé → Accepté → Refusé → Archivé), avec priorité, budget, nb stagiaires souhaités, et lien vers le devis et la formation correspondante.

**Critères d'acceptation** :
- [ ] Affichage Kanban par statut
- [ ] Liaison bidirectionnelle besoin ↔ devis ↔ formation

---

### FR-005 : Gestion des devis

**Priorité** : Must Have

**Description** :
Le système gère un pipeline Kanban de devis (Brouillon → Envoyé → Accepté → Refusé → Expiré) avec lignes (désignation, quantité, prix unitaire HT, montant HT), calcul automatique HT/TVA/TTC, et export PDF professionnel (logo, encadrés client/émetteur, tableau TVA, signature).

**Critères d'acceptation** :
- [ ] Les totaux HT/TVA/TTC sont recalculés automatiquement à chaque modification de ligne
- [ ] Le PDF respecte le layout : logo, encadrés, tableau TVA, signature
- [ ] Un devis "Accepté" peut générer une facture en 1 clic

**Dépendances** : FR-001

---

### FR-006 : Gestion des factures

**Priorité** : Must Have

**Description** :
Le système gère les factures générées depuis un devis (montants reportés automatiquement), avec statuts (En attente → Envoyée → Payée → En retard → Annulée), marquage "Payée" avec date, et export PDF.

**Critères d'acceptation** :
- [ ] Une facture conserve la référence du devis source (lien bidirectionnel)
- [ ] Le PDF facture inclut la référence devis et l'échéance
- [ ] Le statut "En retard" est dérivé automatiquement à partir de l'échéance

**Dépendances** : FR-005

---

### FR-007 : Tunnel CA global

**Priorité** : Must Have

**Description** :
Le système affiche un tunnel financier "Devis en cours → Facturé à encaisser → Encaissé" à la fois au niveau global (page commercial) et au niveau de chaque fiche entreprise.

**Critères d'acceptation** :
- [ ] Les montants se mettent à jour en temps réel selon les statuts des devis et factures
- [ ] Le tunnel est filtrable par période

**Dépendances** : FR-005, FR-006

---

### FR-008 : Génération de documents pédagogiques PDF

**Priorité** : Must Have

**Description** :
Le système génère les documents pédagogiques en PDF (convention de formation, convocation, feuille de présence, attestation de fin de formation) ainsi que les documents commerciaux (devis, facture). Tous incluent logo RFC, coordonnées société, et bloc signature + date pour chaque partie.

**Critères d'acceptation** :
- [ ] Les 6 documents listés sont générables depuis l'interface
- [ ] Les paramètres organisme (logo, coordonnées) sont injectés automatiquement
- [ ] La génération est compatible avec l'environnement serverless Netlify

**Dépendances** : FR-003, FR-005, FR-006, FR-014

---

### FR-009 : Évaluations à chaud et à froid

**Priorité** : Must Have

**Description** :
Le système envoie automatiquement le questionnaire à chaud à la fin d'une session (transition vers "Terminée") et le questionnaire à froid à J+21 via un cron quotidien à 8h. L'accès se fait par lien tokenisé sans création de compte. Une page publique présente un wizard multi-étapes avec étoiles, barre de progression et page de confirmation.

**Critères d'acceptation** :
- [ ] L'envoi à chaud est déclenché par la transition de statut session → Terminée
- [ ] Le cron J+21 traite les sessions éligibles chaque jour à 8h
- [ ] Les tokens sont uniques par stagiaire et non réutilisables
- [ ] Un feedback formateur séparé est collecté (note + commentaires conditions, dynamique, suggestions)

**Dépendances** : FR-003

---

### FR-010 : Suivi Qualiopi

**Priorité** : Must Have

**Description** :
Le système permet le suivi des 32 indicateurs Qualiopi répartis sur 7 critères, avec statut par indicateur (Conforme / En cours / Non conforme / Non applicable), preuves jointes (documents, processus, enregistrements), marquage des indicateurs prioritaires, date d'audit et commentaires.

**Critères d'acceptation** :
- [ ] Chaque indicateur dispose d'un statut, de preuves attachables, et d'un champ commentaire
- [ ] Les indicateurs Qualiopi sont stockés en base (non en dur dans le code) pour permettre une mise à jour rapide en cas d'évolution réglementaire
- [ ] Filtre par statut et par critère

---

### FR-011 : Bilan Pédagogique et Financier (BPF)

**Priorité** : Must Have

**Description** :
Le système calcule automatiquement le BPF annuel (nb sessions, stagiaires, heures, CA HT), avec détail par session et répartition par catégorie de formation, et l'export en PDF conforme.

**Critères d'acceptation** :
- [ ] Le calcul est régénéré sans ressaisie chaque année
- [ ] Le PDF inclut logo RFC, statistiques et tableau des sessions

**Dépendances** : FR-002, FR-003, FR-006

---

### FR-012 : Portail Formateur

**Priorité** : Must Have

**Description** :
Le système expose à `/espace-formateur` un portail pour le formateur connecté, donnant accès à : planning (calendrier), sessions (détails, stagiaires, feuilles de présence), disponibilités (déclaration de créneaux), documents (CV, contrats, documents de sessions), feedbacks de formation, attestations à valider.

**Critères d'acceptation** :
- [ ] Le formateur ne voit que ses propres sessions et données
- [ ] La déclaration de disponibilités est éditable par le formateur

**Dépendances** : FR-013 (auth), FR-003

---

### FR-013 : Portail Client

**Priorité** : Must Have

**Description** :
Le système expose à `/espace-client` un portail pour le contact référent d'une entreprise, donnant accès à : formations (sessions et inscriptions), stagiaires (collaborateurs inscrits), documents (conventions, convocations, attestations), devis, résultats d'évaluations.

**Critères d'acceptation** :
- [ ] Le client ne voit que les données de son entreprise
- [ ] Les documents PDF sont téléchargeables depuis le portail

**Dépendances** : FR-013 (auth), FR-001

---

### FR-014 : Gestion des comptes utilisateurs et rôles

**Priorité** : Must Have

**Description** :
Le système gère les comptes (admin, formateur, client) avec création, liaison formateur ↔ compte, liaison client ↔ entreprise, réinitialisation de mot de passe, activation/désactivation. Le middleware Next.js applique les règles d'accès par rôle sur toutes les routes protégées.

**Critères d'acceptation** :
- [ ] 3 rôles distincts : `admin`, `formateur`, `client`
- [ ] Aucune route protégée n'est accessible sans le rôle requis (vérifié par middleware)

---

### FR-015 : Paramètres organisme et notifications in-app

**Priorité** : Must Have

**Description** :
Le système permet de configurer les paramètres globaux de l'organisme (nom, slogan, adresse, tel, email, SIRET, NDA, N° TVA, conditions de paiement, mentions légales), utilisés automatiquement dans tous les PDF. Des notifications in-app alertent l'utilisateur (sessions à venir, devis expirés, factures en retard) avec types info/succès/avertissement/erreur, lien vers la ressource, marquage lu/non-lu.

**Critères d'acceptation** :
- [ ] Les paramètres sont injectés automatiquement dans les PDFs générés (FR-008, FR-011)
- [ ] Les notifications sont visibles dans une cloche d'en-tête avec compteur de non-lues

---

## 5. Non-Functional Requirements (NFRs)

### NFR-001 : Performance (Standard PME)

**Priorité** : Must Have

**Description** :
Les API doivent répondre en moins de 500 ms au p95 sous charge normale (1-10 utilisateurs simultanés). Les pages doivent atteindre l'état interactif (TTI) en moins de 3 s sur connexion 4G.

**Critères d'acceptation** :
- [ ] API < 500 ms p95 sur les routes principales (`/api/sessions`, `/api/devis`, `/api/factures`)
- [ ] Génération PDF (devis/facture/attestation) < 5 s

**Rationale** : volume cible RFC ≈ équipe < 10 personnes, pas de besoin SaaS.

---

### NFR-002 : Disponibilité

**Priorité** : Must Have

**Description** :
Le service vise 99 % de disponibilité en heures ouvrées (lundi-vendredi 8h-19h CET). Les sauvegardes automatiques quotidiennes Supabase sont conservées au moins 7 jours.

**Critères d'acceptation** :
- [ ] Monitoring d'erreurs en place (Sentry — déjà configuré)
- [ ] Sauvegardes Supabase activées et vérifiées trimestriellement

**Rationale** : usage métier en journée, pas d'astreinte 24/7.

---

### NFR-003 : Sécurité — Authentification & Autorisation

**Priorité** : Must Have

**Description** :
L'authentification se fait par NextAuth (credentials) avec mots de passe hashés. Le middleware Next.js applique le contrôle d'accès par rôle (admin / formateur / client) sur toutes les routes protégées. Les tokens d'évaluation (FR-009) et d'inscription publique (FR-003) sont uniques, à usage unique pour les évaluations, et invalidables.

**Critères d'acceptation** :
- [ ] Mots de passe stockés hashés (jamais en clair)
- [ ] Aucune route privée accessible sans session valide
- [ ] Les tokens publics ne permettent l'accès qu'à la ressource ciblée

---

### NFR-004 : Conformité RGPD

**Priorité** : Must Have

**Description** :
Les données personnelles (contacts, stagiaires, évaluations) doivent respecter le RGPD : finalité documentée, possibilité d'export/suppression sur demande, conservation limitée. Les données sont hébergées en UE (Supabase EU region).

**Critères d'acceptation** :
- [ ] Données hébergées Supabase région EU
- [ ] Procédure documentée pour répondre à une demande d'export/suppression

---

### NFR-005 : Conformité Qualiopi

**Priorité** : Must Have

**Description** :
Le système doit fournir une traçabilité documentaire complète permettant de passer un audit Qualiopi : preuves attachées aux indicateurs, documents pédagogiques générés et signés, feuilles de présence émargées, évaluations collectées.

**Critères d'acceptation** :
- [ ] 100 % des sessions terminées ont leurs feuilles de présence stockées
- [ ] 100 % des indicateurs en "Non conforme" ou "En cours" sont commentés

**Rationale** : raison d'être principale du projet (cf. brief §2).

---

### NFR-006 : Compatibilité navigateurs

**Priorité** : Must Have

**Description** :
L'application doit fonctionner sur Chrome, Edge, Safari, Firefox (deux dernières versions majeures) sur desktop et être responsive sur tablette (768 px+). Le mobile (< 768 px) n'est pas une cible v1.

**Critères d'acceptation** :
- [ ] Tests de fumée sur Chrome/Edge/Safari/Firefox récents
- [ ] Layout utilisable sur iPad (1024×768)

---

### NFR-007 : Maintenabilité

**Priorité** : Should Have

**Description** :
Le code suit TypeScript strict, lint via ESLint, structure Next.js App Router. La base de données est modélisée via Prisma (migrations versionnées). Les conventions sont documentées dans le PRD technique (PRD.md §5).

**Critères d'acceptation** :
- [ ] Build TS sans erreur (`tsc --noEmit`)
- [ ] Lint sans erreur bloquante (`eslint`)
- [ ] Migrations Prisma appliquées sans drift entre dev et prod

**Rationale** : équipe de développement réduite — la maintenabilité réduit la dépendance bus-factor.

---

## 6. Epics

### EPIC-001 : CRM & Catalogue

**Description** :
Fondation CRM — gestion des entreprises clientes, contacts/stagiaires, catalogue de formations et planification des sessions avec inscriptions.

**FRs associées** : FR-001, FR-002, FR-003

**Estimation stories** : 5-7

**Priorité** : Must Have

**Valeur business** : centralisation des données clients et opérationnelles — précondition à tout le reste.

---

### EPIC-002 : Commerce & Documents

**Description** :
Pipeline commercial complet (besoins → devis → factures → tunnel CA) + génération de tous les documents PDF (commerciaux et pédagogiques).

**FRs associées** : FR-004, FR-005, FR-006, FR-007, FR-008

**Estimation stories** : 6-8

**Priorité** : Must Have

**Valeur business** : automatisation de la facturation, image professionnelle via PDFs, accélération du cycle commercial.

---

### EPIC-003 : Conformité & Évaluations

**Description** :
Outillage Qualiopi (32 indicateurs + preuves), BPF annuel automatisé, évaluations à chaud et à froid avec wizard public tokenisé et feedback formateur.

**FRs associées** : FR-009, FR-010, FR-011

**Estimation stories** : 4-6

**Priorité** : Must Have

**Valeur business** : raison d'être réglementaire du projet — sécurise la certification Qualiopi et l'éligibilité aux financements.

---

### EPIC-004 : Portails & Plateforme

**Description** :
Portails self-service formateur et client, gestion des comptes utilisateurs avec rôles, paramètres organisme et notifications in-app.

**FRs associées** : FR-012, FR-013, FR-014, FR-015

**Estimation stories** : 5-7

**Priorité** : Must Have

**Valeur business** : autonomie des utilisateurs externes (réduction de la sollicitation admin), différenciation concurrentielle.

---

## 7. Matrice de traçabilité

| Epic | Nom | FRs | Estimation stories |
|------|-----|-----|--------------------|
| EPIC-001 | CRM & Catalogue | FR-001, FR-002, FR-003 | 5-7 |
| EPIC-002 | Commerce & Documents | FR-004, FR-005, FR-006, FR-007, FR-008 | 6-8 |
| EPIC-003 | Conformité & Évaluations | FR-009, FR-010, FR-011 | 4-6 |
| EPIC-004 | Portails & Plateforme | FR-012, FR-013, FR-014, FR-015 | 5-7 |

**Total estimé** : 20-28 stories (Level 2 cible 5-15, projet dépasse légèrement la borne haute — cohérent avec un système déjà en production couvrant 12 modules fonctionnels).

---

## 8. User stories

Stories détaillées créées en Phase 4 via `/bmad:sprint-planning`.

---

## 9. Synthèse priorisation

| Catégorie | Must Have | Should Have | Could Have |
|-----------|-----------|-------------|------------|
| Functional Requirements | 15 | 0 | 0 |
| Non-Functional Requirements | 6 | 1 | 0 |
| Epics | 4 | 0 | 0 |

*Toutes les FRs sont **Must Have** car le périmètre v1 est déjà livré ; les arbitrages "Should/Could" seront utilisés lors des futures phases (v2, roadmap).*

---

## 10. Dépendances

### Internes
- Stack Next.js 14 (App Router) + TypeScript
- Prisma 5 sur PostgreSQL (Supabase)
- pdfmake pour la génération PDF côté serveur
- NextAuth v4 (credentials)
- Nodemailer (SMTP)

### Externes
- Supabase (PostgreSQL managé, sauvegardes, région EU)
- Netlify (hébergement serverless, crons natifs, déploiement GitHub)
- Serveur SMTP configurable (envoi des emails transactionnels)
- Sentry (monitoring d'erreurs)

---

## 11. Hypothèses

- RFC dispose d'un serveur SMTP fiable pour les envois transactionnels.
- L'équipe RFC accepte d'abandonner ses anciens outils et de saisir 100 % des sessions dans le CRM.
- Les formateurs externes acceptent de se connecter régulièrement au portail formateur.
- Le volume d'activité de RFC tient dans les limites des plans Supabase et Netlify utilisés (à valider à chaque palier de croissance).
- Les indicateurs Qualiopi modélisés en base couvrent la version actuelle du référentiel.

---

## 12. Hors périmètre (v1)

- Signature électronique (devis, convention) — roadmap haute priorité
- Module CPF / financement OPCO automatisé — roadmap haute priorité
- Application mobile formateur (émargement numérique) — roadmap moyenne priorité
- Intégration agenda Google / Outlook — roadmap moyenne priorité
- Tableau de bord analytique avancé (graphes CA, taux remplissage) — roadmap moyenne priorité
- Marketplace formations (page publique catalogue) — roadmap basse priorité
- Chatbot IA assistant pédagogique — roadmap basse priorité
- Mode SaaS multi-organismes — roadmap basse priorité

---

## 13. Questions ouvertes

- Quand cibler la v2 et avec quelle priorisation entre signature électronique et module CPF/OPCO ?
- Faut-il documenter une procédure RGPD formalisée (registre des traitements) au-delà des dispositions techniques actuelles ?
- Le volume actuel justifie-t-il déjà un plan Supabase / Netlify supérieur, ou les plans gratuits/starter suffisent ?
- Existe-t-il un audit Qualiopi planifié sur les 12 prochains mois qui imposerait des évolutions ?

---

## 14. Stakeholders

Repris du product brief §7 :

- **Owner / dirigeant RFC** — Sponsor, décisionnaire roadmap
- **Admin RFC** — Utilisateurs quotidiens, adoption critique
- **Formateurs** — Utilisateurs du portail formateur
- **Prestataire de développement (Ismael Lepennec)** — Exécution, maintenance, évolutions

---

*Document généré par le workflow `/bmad:prd` le 2026-05-16, à partir de [PRD.md](../PRD.md) (avril 2026) et du [product brief](product-brief-rfc-formations-2026-05-16.md).*
