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
| **Environnement staging** | Setup ponctuel | (à produire — STORY-TD-007) |

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
