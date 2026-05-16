# Procédures opérationnelles — RFC Formations

Index des procédures opérationnelles. Tout ce qui n'est pas du code applicatif mais qui doit être documenté pour exécuter en autonomie : déploiement, rollback, secrets, incidents, RGPD, DR.

---

## Index

| Procédure | Quand | Document |
|-----------|-------|----------|
| **Déploiement** | À chaque release sur main | [deployment.md](deployment.md) |
| **Rollback** | Après un déploiement cassé | [deployment.md#rollback](deployment.md#rollback) |
| **Rotation des secrets** | Incident, audit annuel | [secret-rotation.md](secret-rotation.md) |
| **Réponse à incident** | Détection d'un incident prod | [incident-response.md](incident-response.md) |
| **Migration chiffrement NSS** | Une fois après mise en prod de TD-001 | [migration-nss.md](migration-nss.md) |
| **Disaster recovery / restore DB** | À blanc 1×/an + en cas de crash | (à produire — STORY-TD-008) |
| **Environnement staging** | Setup ponctuel + workflow de test release | [environments.md](environments.md) |

---

## Conventions

- **Tout document opérationnel** doit indiquer en tête : *Quand*, *Qui peut l'exécuter*, *Impact utilisateurs*, *Durée estimée*.
- **Tout incident** doit donner lieu à un post-mortem dans `docs/operations/incident-YYYY-MM-DD-<slug>.md`.
- **Toute rotation** de secret doit être loguée dans un changelog interne (date + qui + raison).

---

## Contacts

- Owner / propriétaire RFC : **TODO** — renseigner nom + email + backup (cf. registre RGPD, art. 30 : responsable de traitement nominatif requis)
- Prestataire dev : Ismael Lepennec
- Hébergeur app : Netlify ([dashboard](https://app.netlify.com))
- Hébergeur DB : Supabase ([dashboard](https://supabase.com/dashboard))
- Monitoring erreurs : Sentry ([dashboard](https://sentry.io))
- Rate-limit / cache : Upstash ([dashboard](https://console.upstash.com))

---

## TODOs datées

| Échéance | Action |
|----------|--------|
| **2026-11-16** | Supprimer les redirects 301 vers les anciennes routes publiques `/fiche-besoin-{client,stagiaire}/[token]` et `/api/besoin-{client,stagiaire}/public/[token]` (cf. [docs/superpowers/specs/2026-05-16-refactor-besoin-design.md](../superpowers/specs/2026-05-16-refactor-besoin-design.md)). 6 mois après le déploiement du refactor besoin. |
