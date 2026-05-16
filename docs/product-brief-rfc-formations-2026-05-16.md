# Product Brief — RFC Formations (FormaPro CRM)

**Auteur** : Ismael Lepennec
**Date** : 2026-05-16
**Projet** : RFC Formations (web-app, Level 2)
**Statut** : Rétroactif — v1 livrée
**URL prod** : https://projetrfc.netlify.app
**Dernières évolutions** : mai 2026

---

## 1. Résumé exécutif

FormaPro CRM est un outil de gestion centralisé conçu pour **RFC Rescue Formation Conseil**, organisme de formation spécialisé en sécurité, incendie et prévention. Il remplace une constellation d'outils dispersés (tableurs, emails, logiciels non connectés) par une plateforme unique couvrant la gestion des clients, du catalogue de formations, des sessions, des devis/factures, des documents pédagogiques, des évaluations à chaud/froid et de la conformité Qualiopi. Cette refonte vise à fiabiliser la conformité réglementaire, automatiser les tâches administratives répétitives et offrir des portails autonomes aux formateurs et clients.

---

## 2. Problème

Avant FormaPro CRM, l'activité de RFC reposait sur des outils non connectés, avec des conséquences directes :

- Pas de suivi centralisé des stagiaires et entreprises clientes
- Devis et factures gérés manuellement, sans lien entre eux
- Questionnaires de satisfaction non envoyés systématiquement
- Documents pédagogiques (convocations, attestations, feuilles de présence) générés à la main, à risque d'erreur
- Suivi Qualiopi non outillé (32 indicateurs à gérer hors-outil)
- Aucun portail self-service pour les formateurs ou les clients

**Pourquoi maintenant** : la certification Qualiopi rend le suivi des 32 indicateurs et la traçabilité documentaire non négociables. Sans outil, chaque audit devient un projet manuel à risque.

**Impact si non résolu** : non-conformité Qualiopi (perte de la certification → perte de l'éligibilité aux financements OPCO/CPF), temps administratif massif, image client dégradée.

---

## 3. Audience cible

### Utilisateurs primaires (quotidiens)

- **Admin RFC** — responsable de l'organisme, accès complet à toutes les fonctionnalités (catalogue, sessions, commercial, documents, Qualiopi, paramètres).
- **Formateurs** — intervenants internes ou externes utilisant `/espace-formateur` pour leur planning, sessions, disponibilités, documents et feedbacks.

### Utilisateurs secondaires

- **Clients (entreprises)** — contact référent d'une entreprise cliente, accès via `/espace-client` à leurs formations, stagiaires, devis, documents et évaluations.
- **Stagiaires** — accès léger par lien tokenisé pour répondre aux questionnaires (à chaud / à froid), sans création de compte.

### Besoins clés couverts

1. Centralisation : tout l'historique commercial et pédagogique au même endroit.
2. Automatisation : suppression des tâches répétitives (factures, emails de satisfaction, documents).
3. Conformité : preuves Qualiopi tenues à jour en continu, exportables à l'audit.

---

## 4. Solution

Application web Next.js déployée sur Netlify, base de données PostgreSQL (Supabase), authentification multi-rôles (admin / formateur / client). Génération de PDF côté serveur (pdfmake), envoi d'emails via SMTP configurable, automatisations par cron Netlify.

**Fonctionnalités cœur** :

- Gestion des entreprises, contacts/stagiaires
- Catalogue formations + planification sessions (statuts, inscriptions, feuilles de présence)
- Pipeline commercial Kanban (besoins → devis → facture → encaissement), avec génération facture-depuis-devis en 1 clic
- Génération automatique de tous les documents pédagogiques en PDF (conventions, convocations, attestations, feuilles de présence)
- Envoi automatique des questionnaires à chaud (à la fin de session) et à froid (J+21, cron quotidien)
- Suivi Qualiopi : 32 indicateurs + preuves jointes
- Calcul automatique du BPF (Bilan Pédagogique et Financier) annuel
- Portails dédiés formateur et client
- Notifications in-app

**Proposition de valeur** : une seule plateforme qui transforme la conformité Qualiopi d'un projet annuel à risque en un état tenu en continu, tout en supprimant les heures hebdomadaires consacrées aux tâches administratives.

---

## 5. Objectifs business

| Objectif | Indicateur de succès |
|----------|---------------------|
| Centraliser la gestion clients & formations | 100 % des sessions créées dans le CRM |
| Automatiser la facturation | Facture générée en 1 clic depuis un devis accepté |
| Automatiser les évaluations | Envoi automatique à la fin de chaque session |
| Outiller la conformité Qualiopi | Suivi des 32 indicateurs dans l'outil, preuves jointes |
| Offrir des portails autonomes | Formateurs et clients accèdent à leurs données sans solliciter l'admin |

**Valeur business globale** : l'ensemble de ces leviers ont été visés simultanément — gain de temps administratif (devis/factures/documents), sécurisation de la conformité Qualiopi (et donc de l'éligibilité aux financements), amélioration de la captation de CA via le tunnel devis→facturé→encaissé, et image professionnelle renforcée auprès des clients via les portails.

---

## 6. Périmètre

### Dans le périmètre v1 (livré)

- 4.1 Entreprises & contacts
- 4.2 Catalogue formations & sessions
- 4.3 Commercial (devis, factures, besoins, tunnel CA)
- 4.4 Documents pédagogiques PDF (convention, convocation, feuille de présence, attestation, devis, facture)
- 4.5 Évaluations à chaud / à froid + feedback formateur
- 4.6 Qualiopi (32 indicateurs, preuves)
- 4.7 BPF
- 4.8 Portail Formateur
- 4.9 Portail Client
- 4.10 Gestion des utilisateurs (admin / formateur / client)
- 4.11 Paramètres globaux organisme
- 4.12 Notifications in-app

### Explicitement hors périmètre v1

- Signature électronique (devis, convention)
- Module CPF / financement OPCO automatisé
- Application mobile formateur (émargement numérique)
- Intégration agenda Google / Outlook
- Tableau de bord analytique avancé (graphes CA, taux de remplissage)
- Marketplace formations (page publique catalogue)
- Chatbot IA assistant pédagogique
- Mode SaaS multi-organismes

### À considérer pour v2+

Cf. roadmap PRD section 8 — priorités hautes : signature électronique et module CPF/OPCO.

---

## 7. Stakeholders

- **Owner / dirigeant RFC** — Influence **Haute**. Sponsor du produit, décisionnaire sur la roadmap et le périmètre.
- **Admin RFC** — Influence **Haute**. Utilisateurs quotidiens ; leur adoption conditionne la valeur réelle de l'outil.
- **Formateurs (internes et externes)** — Influence **Moyenne**. Utilisateurs du portail formateur ; leur retour conditionne l'usage des disponibilités et feuilles de présence.
- **Prestataire de développement (Ismael Lepennec)** — Influence **Haute** sur l'exécution technique ; responsable de la livraison, de la maintenance et des évolutions.

*(Clients entreprises et stagiaires non listés comme stakeholders décisionnaires — utilisateurs finaux uniquement.)*

---

## 8. Contraintes & hypothèses

### Contraintes

- **Réglementaire** : conformité Qualiopi obligatoire (32 indicateurs, traçabilité des preuves).
- **Technique** : déploiement serverless (Netlify) → pas de processus longue durée, génération PDF côté serveur compatible serverless (pdfmake).
- **Données** : RGPD (données stagiaires, contacts client, évaluations).
- **Ressources** : équipe de développement réduite (essentiellement un prestataire) → favoriser les solutions managées (Supabase, Netlify) et les patterns simples.

### Hypothèses

- RFC dispose d'une connexion SMTP fiable pour l'envoi des emails transactionnels.
- L'équipe admin de RFC est prête à abandonner ses anciens outils (tableurs, emails) et à saisir l'ensemble des sessions dans le CRM.
- Les formateurs externes accepteront de se connecter régulièrement au portail pour gérer disponibilités et feuilles de présence.
- L'infrastructure Supabase + Netlify suffira au volume d'activité de RFC sans tuning particulier.

---

## 9. Critères de succès

- 100 % des sessions de formation gérées dans l'outil (et plus sur tableur)
- Aucun devis ou facture produit hors de l'outil
- Taux de réponse aux questionnaires de satisfaction à chaud > 50 %
- Aucun indicateur Qualiopi en statut "Non conforme" non documenté
- BPF généré automatiquement chaque année sans ressaisie
- Tickets utilisateurs récurrents ≤ 1 par semaine après stabilisation
- Audit Qualiopi passé sans demande de pièce complémentaire impossible à produire depuis l'outil

---

## 10. Timeline

- **Statut actuel** : v1 récente, livrée en production sur https://projetrfc.netlify.app
- **Dernières évolutions** : mai 2026 (cf. historique git — corrections UI, simplification de l'écran paramètres)
- **Prochains jalons** : à définir en fonction de la roadmap PRD §8 (probable priorité : signature électronique, puis module CPF/OPCO).

---

## 11. Risques

- **Risque** : audit Qualiopi en échec si les données dans l'outil sont incomplètes ou si les preuves ne sont pas systématiquement attachées.
  - **Probabilité** : Moyenne
  - **Mitigation** : alertes in-app sur indicateurs en "Non conforme" ou "En cours" sans preuve ; checklist pré-audit ; documentation utilisateur dédiée Qualiopi.

- **Risque** : adoption partielle — l'équipe RFC continue à utiliser ses anciens outils en parallèle, créant des données dédoublées et un BPF inexact.
  - **Probabilité** : Moyenne
  - **Mitigation** : accompagnement utilisateur initial, suivi des indicateurs d'usage (sessions créées, devis émis), retrait progressif des anciens outils.

- **Risque** : dépendance à un prestataire unique pour la maintenance et les évolutions (bus factor).
  - **Probabilité** : Moyenne
  - **Mitigation** : documentation technique à jour (PRD, README, modèle de données), stack mainstream (Next.js, Prisma, Supabase) facilitant la reprise par un autre développeur.

- **Risque** : fiabilité des automatisations (envoi d'emails, génération PDF, cron quotidien) — une défaillance silencieuse peut casser le suivi qualité.
  - **Probabilité** : Faible-Moyenne
  - **Mitigation** : monitoring (Sentry déjà en place), alertes sur échecs cron, logs des envois email.

- **Risque** : évolution réglementaire Qualiopi (changement des indicateurs ou de leur libellé).
  - **Probabilité** : Faible
  - **Mitigation** : indicateurs Qualiopi modélisés en base (et non en dur), permettant une mise à jour rapide.

---

*Document généré par le workflow `/bmad:product-brief` le 2026-05-16, à partir du PRD existant (PRD.md, avril 2026) et d'un entretien rétroactif avec l'auteur.*
