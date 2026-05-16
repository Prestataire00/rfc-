# Registre des traitements RGPD — RFC Formations

**Responsable du traitement** : RFC Rescue Formation Conseil
**Date de mise à jour** : 2026-05-16
**Référence article 30 RGPD** : tenue d'un registre des activités de traitement

---

## Vue d'ensemble

| Domaine | Catégorie de personnes | Base légale | Conservation | Sécurité |
|---------|------------------------|-------------|--------------|----------|
| Gestion des comptes utilisateurs | Admin, formateurs, clients | Exécution du contrat | Durée du contrat + 3 ans | Hash bcrypt, JWT 24h |
| Gestion des stagiaires et formations | Stagiaires, contacts entreprises | Exécution du contrat / obligation légale (Qualiopi, BPF) | 10 ans (BPF), 5 ans (Qualiopi) | Chiffrement NSS AES-256-GCM, RBAC |
| Devis, factures, paiements | Contacts client | Obligation légale (comptabilité) | 10 ans (Code de commerce) | RBAC admin |
| Évaluations à chaud / à froid | Stagiaires | Obligation légale (Qualiopi) + intérêt légitime | 5 ans (Qualiopi) | Token tokenisé, pas de compte requis |
| Campagnes marketing | Prospects, contacts | Consentement (opt-in) | Jusqu'à opt-out + 3 ans | Opt-out tracé (`MarketingOptOut`) |
| Forum & messagerie interne | Utilisateurs connectés | Intérêt légitime | Durée du contrat + 1 an | RBAC, DOMPurify |
| Analyse IA documents | Stagiaires (CV, attestations) | Intérêt légitime + consentement | Effacement après analyse + 30 j | API key, ai-guard, pas de stockage prompt côté tiers configuré |

---

## 1. Gestion des comptes utilisateurs

**Finalité** : Authentifier les utilisateurs et leur donner accès aux fonctionnalités liées à leur rôle (admin / formateur / client).

**Catégories de données** :
- Identité : nom, prénom, email
- Authentification : hash bcrypt du mot de passe
- Rôle : admin / formateur / client
- Référence : `formateurId` (si formateur), `entrepriseId` (si client)

**Base légale** : Article 6.1.b RGPD — exécution du contrat (formation, prestation).

**Destinataires** : Admin RFC (lecture / écriture), utilisateur lui-même (lecture de son propre profil).

**Durée de conservation** : Durée du contrat + 3 ans (prescription civile).

**Mesures de sécurité** :
- Mot de passe hashé bcrypt (jamais en clair)
- Session JWT (`NextAuth v4`) avec TTL 24h
- Désactivation via `User.actif = false` (effective au prochain refresh ≤ 1h)
- Rate-limit anti-brute-force (`lib/rate-limit.ts` + Upstash)
- Rotation `NEXTAUTH_SECRET` documentée (`docs/operations/secret-rotation.md`)

**Transferts hors UE** : aucun (Supabase région EU).

---

## 2. Gestion des stagiaires et formations

**Finalité** : Inscrire et suivre les stagiaires aux sessions de formation, générer les documents pédagogiques (convention, convocation, feuille de présence, attestation), tenir les obligations Qualiopi et BPF.

**Catégories de données** :
- Identité : nom, prénom, email, téléphone, date de naissance, lieu de naissance, sexe, pays, adresse personnelle
- Données légales : numéro de sécurité sociale (NSS), numéro Passeport Prévention (décret 2022-1434), niveau de formation, diplômes
- Données contextuelles : poste, entreprise, besoins d'adaptation (RQTH / contraintes), opt-out marketing
- Inscriptions, présence, attestations, évaluations

**Base légale** :
- Article 6.1.b RGPD — exécution du contrat (formation)
- Article 6.1.c RGPD — obligation légale (Qualiopi, BPF, Passeport Prévention)

**Destinataires** :
- Admin RFC (lecture / écriture complète)
- Formateurs (lecture des données de leurs sessions uniquement, via `/espace-formateur`)
- Client entreprise (lecture des données de ses stagiaires uniquement, via `/espace-client`)
- Stagiaire lui-même (lecture / soumission via lien tokenisé pour évaluation et fiche besoin)

**Durée de conservation** :
- BPF : 10 ans à compter de la fin de la session (obligation légale Code du travail)
- Qualiopi (preuves d'indicateurs) : 5 ans
- Données ré-actualisables (RQTH, opt-out) : durée d'activité + 3 ans

**Mesures de sécurité** :
- **NSS chiffré AES-256-GCM** au repos (`lib/encryption.ts`, préfixe `enc::v1::`)
- RBAC strict via middleware Next.js (admin / formateur / client)
- Hébergement Supabase région EU
- Sauvegardes automatiques quotidiennes
- Logs ne contiennent jamais le NSS en clair (Sentry config `sendDefaultPii: false`)

**Transferts hors UE** : aucun.

---

## 3. Devis, factures, paiements

**Finalité** : Établir les contrats commerciaux et tenir la comptabilité conformément au Code de commerce.

**Catégories de données** :
- Identité contact référent : nom, prénom, email, téléphone, poste
- Entreprise : raison sociale, SIRET, adresse, secteur
- Données financières : montants devis / facture, paiements, échéances, transactions bancaires
- Financements OPCO / CPF (le cas échéant)

**Base légale** : Article 6.1.c RGPD — obligation légale (comptabilité, Code de commerce art. L123-22).

**Destinataires** : Admin RFC, comptable RFC (si externe — convention de sous-traitance à formaliser), client entreprise (consultation de ses propres devis / factures via `/espace-client`).

**Durée de conservation** : 10 ans à compter de la clôture de l'exercice comptable (Code de commerce L123-22).

**Mesures de sécurité** :
- RBAC admin pour création / modification
- Numérotation séquentielle des factures (intégrité)
- PDF signé numériquement le cas échéant

**Transferts hors UE** : aucun.

---

## 4. Évaluations à chaud et à froid

**Finalité** : Mesurer la satisfaction des stagiaires conformément à l'indicateur Qualiopi correspondant et au feedback formateur.

**Catégories de données** :
- Identifiant stagiaire (via token, pas de re-saisie)
- Réponses (notation 1-5 étoiles, commentaires libres)
- Date de soumission

**Base légale** :
- Article 6.1.c RGPD — obligation légale (Qualiopi)
- Article 6.1.f RGPD — intérêt légitime (amélioration des prestations)

**Destinataires** : Admin RFC, formateur concerné (pour feedback formateur), client entreprise (consultation agrégée via `/espace-client`).

**Durée de conservation** : 5 ans (Qualiopi).

**Mesures de sécurité** :
- Accès par lien tokenisé unique par stagiaire (`Evaluation.tokenAcces`)
- Pas de création de compte requise
- Rate-limit sur l'endpoint public (`/api/evaluations/public`)
- Le commentaire libre est sanitizé via DOMPurify avant affichage

**Transferts hors UE** : aucun.

---

## 5. Campagnes marketing

**Finalité** : Communiquer auprès des prospects et clients sur les nouvelles offres de formation.

**Catégories de données** :
- Email, nom, prénom
- Préférences de communication (opt-in / opt-out)
- Statistiques d'envoi (ouverture, clic, désinscription)

**Base légale** : Article 6.1.a RGPD — consentement (opt-in pour les prospects, intérêt légitime pour les clients existants au sens de la loi française "Informatique et Libertés" art. L34-5 CPCE).

**Destinataires** : Admin RFC. Pas de partage avec des tiers.

**Durée de conservation** :
- Liste active : tant que l'opt-out n'est pas exercé
- Trace de l'opt-out : 3 ans après l'opt-out (preuve de respect du droit d'opposition)

**Mesures de sécurité** :
- Lien de désinscription dans chaque email (`/api/campaigns/unsubscribe`)
- Traçabilité de l'opt-out (`MarketingOptOut`, `Contact.optOutMarketing`)
- Tracking des événements emails (`EmailTrackingEvent`) pour mesurer l'efficacité — pas de profilage individuel

**Transferts hors UE** : aucun (SMTP configuré par RFC — vérifier le fournisseur).

---

## 6. Forum interne et messagerie

**Finalité** : Permettre la communication interne entre admin, formateurs, et le suivi des discussions / messages directs.

**Catégories de données** :
- Identifiant utilisateur (lien à `User`)
- Contenu des messages (texte, sanitizé via DOMPurify)
- Métadonnées : date, conversation, participants

**Base légale** : Article 6.1.f RGPD — intérêt légitime (collaboration interne).

**Destinataires** : Utilisateurs des conversations concernées uniquement (RBAC).

**Durée de conservation** : Durée du contrat de l'utilisateur + 1 an.

**Mesures de sécurité** :
- RBAC : seuls les participants d'une `Conversation` voient ses messages
- Contenu HTML sanitizé via DOMPurify
- Suppression sur demande (cf. `DemandeRgpd`)

**Transferts hors UE** : aucun.

---

## 7. Analyse IA des documents

**Finalité** : Assister l'admin dans l'analyse de documents (CV stagiaires, attestations, etc.) via Claude (Anthropic).

**Catégories de données** :
- Contenu du document soumis (PDF, texte extrait)
- Résultat de l'analyse (`AiDocumentAnalysis`)

**Base légale** : Article 6.1.f RGPD — intérêt légitime (efficacité administrative).

**Destinataires** : Admin RFC (lecture des résultats). Anthropic (en tant que sous-traitant — éditer un DPA si pas déjà signé). Hébergement Anthropic : États-Unis (transfert hors UE — clauses contractuelles types Anthropic).

**Durée de conservation** :
- Stockage local : effacement automatique 30 jours après l'analyse
- Anthropic : suivant la politique de rétention Anthropic (vérifier `enable_zdr` / zero-data-retention si DSPI sensibles soumises)

**Mesures de sécurité** :
- Route `/api/ai` réservée aux admins (middleware)
- `lib/ai-guard.ts` : quotas par utilisateur et anti-abus
- `ANTHROPIC_API_KEY` stockée en env Netlify

**Transferts hors UE** : Oui, Anthropic (USA). Encadré par les clauses contractuelles types et politique de confidentialité Anthropic.

---

## Droits des personnes

Toute personne dont les données sont traitées peut exercer ses droits :
- **Accès** : obtenir une copie des données
- **Rectification** : corriger des données inexactes
- **Effacement** : demander la suppression (sous réserve des obligations légales — BPF/comptabilité)
- **Opposition** : refuser un traitement (notamment marketing — opt-out)
- **Portabilité** : recevoir les données dans un format structuré

**Modalités** :
- Page publique : [/rgpd/demande](/rgpd/demande)
- Workflow : `DemandeRgpd` (modèle Prisma) — suivi admin via `/api/rgpd/demandes`
- Délai de réponse : 1 mois (extensible à 3 mois si demande complexe — art. 12.3 RGPD)

---

## Notification de violation

En cas de violation de données :

1. **Détection** → Sentry + audit `HistoriqueAction` + `SignatureTokenAttempt`
2. **Évaluation** sous 72h (probabilité d'atteinte aux droits)
3. **Notification CNIL** (téléservice CNIL) si risque
4. **Notification personnes concernées** si risque élevé
5. **Post-mortem documenté** dans `docs/operations/incident-*.md`

---

## Annexes

### Sous-traitants identifiés

| Sous-traitant | Service | DPA | Localisation données |
|---------------|---------|-----|----------------------|
| Supabase | PostgreSQL + Storage | À vérifier | EU |
| Netlify | Hébergement web + Edge Functions | À vérifier | Multi-région (CDN), build US |
| Anthropic | IA Claude | À signer si pas fait | US (clauses types) |
| Upstash | Redis (rate-limit) | À vérifier | EU (région à confirmer) |
| Sentry | Monitoring erreurs | À vérifier | EU (région à choisir) |
| FreeTSA | Horodatage signature | NA (service public RFC 3161) | Allemagne |
| Fournisseur SMTP | Envoi emails | À identifier selon config | Selon fournisseur |

**Action requise** : auditer chaque sous-traitant pour vérifier qu'un DPA (Data Processing Agreement) est en place. Documenter dans une annexe séparée si besoin.

---

## Procédure de mise à jour

Ce registre doit être revu :
- À chaque ajout d'un nouveau traitement (nouvelle fonctionnalité produit traitant des données personnelles)
- À chaque changement de sous-traitant
- À minima **annuellement** (audit RGPD)

Responsable de la mise à jour : Owner RFC (ou DPO si désigné).
