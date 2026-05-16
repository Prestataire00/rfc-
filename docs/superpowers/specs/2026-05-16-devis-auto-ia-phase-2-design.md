# Devis auto-généré IA à la qualification — Phase 2

**Date** : 2026-05-16
**Auteur** : Ismael Lepennec
**Statut** : Design approuvé, à implémenter
**Origine** : suite de Phase 1 (formulaire prospect unifié). Vision utilisateur : "si le prospect est passé en client le devis se génère automatiquement grâce à l'IA". Affinée en brainstorming : trigger sur passage au statut `qualifié` (avant envoi), pas `client` (post-signature).

---

## Problème

Aujourd'hui, après création d'un prospect (Phase 1), l'admin doit :
1. Ouvrir la Demande
2. Cliquer "Générer devis" (PR #98 : `app/api/qualiopi/fiches-entreprise/[id]/generate-devis`) → génère un brouillon **basique** : 1 ligne avec la formation associée à la session + tarif × effectif. **Ne fonctionne que pour les fiches Qualiopi post-signature**, pas pour les Demandes.
3. Sinon, créer le devis manuellement de zéro

**Friction** :
- Pas de génération depuis une `Demande` (concept prospect amont) — seulement depuis `FichePreFormationEntreprise` (post-signature)
- Le matching formation est manuel : l'admin doit chercher dans le catalogue laquelle correspond le mieux au besoin décrit
- Le contenu du devis (libellé, objet, notes) est manuel

**Vision** : quand l'admin qualifie un prospect (= prêt à recevoir un devis), l'IA propose automatiquement un devis brouillon pertinent : meilleure formation du catalogue, lignes pré-remplies, objet professionnel. L'admin révise puis envoie.

---

## Solution retenue

### Trigger

Quand `Demande.statut` transitionne de `nouveau` → `qualifie` via `PATCH /api/demandes/[id]`.

**Conditions** :
- Pas de devis déjà associé à la Demande (`Demande.devisId === null`) → sinon skip pour éviter les doublons
- Modal de confirmation côté UI avant le PATCH : *"Cela va générer un devis brouillon avec l'IA. Continuer ?"*

### Flow

1. Admin clique le select statut sur la fiche Demande → choisit "Qualifié"
2. Modal de confirmation s'affiche (uniquement pour cette transition)
3. Si confirmé → PATCH `/api/demandes/[id]` avec `{ statut: "qualifie" }`
4. Le handler détecte la transition `nouveau→qualifie` :
   - Update statut
   - Si `devisId === null` → appelle `generateDevisFromDemandeWithAI(demandeId)` (fire-and-forget ou inline avec timeout)
   - Le résultat inclut `aiGeneratedDevisId` si OK
5. Réponse API : `{ statut: "qualifie", aiGeneratedDevisId: "...", aiSuccess: true | false, aiError?: string }`
6. UI : toast succès + lien "Voir le devis brouillon"
7. Si erreur AI : toast warning + statut updated quand même, admin crée le devis manuellement après

### Composants techniques

#### `lib/ai/generate-devis-from-demande.ts` (nouveau)

Fonction TypeScript exportée :

```ts
export async function generateDevisFromDemandeWithAI(
  demandeId: string,
): Promise<{ devisId: string } | { error: string }>;
```

Algorithme :
1. Charge `Demande` + `Entreprise` + `Contact`
2. Charge catalogue `Formation` actives (limité à 20 max pour rester sous le context window)
3. Construit un prompt Claude :
   ```
   Tu es un assistant pour un organisme de formation (sécurité, incendie, premiers secours).
   Un prospect demande une formation. Voici le contexte :
   
   ENTREPRISE: {nom}, secteur {secteur}, effectif {effectif}, type {TPE|PME|ETI|GE}
   CONTACT: {nom} {prenom}, poste {poste}
   DEMANDE:
   - Titre: {titre}
   - Description: {description}
   - Notes: {notes}
   - Nombre de stagiaires souhaité: {nbStagiaires}
   - Budget envisagé: {budget} € HT (optionnel)
   - Source: {sourceContact}
   
   CATALOGUE DISPONIBLE ({N} formations actives) :
   - [{id}] {titre} | durée {duree}h | tarif {tarif}€ HT par stagiaire | catégorie {categorie} | {certifiante ? "CERTIFIANTE" : "non certifiante"} | description: {description courte}
   - ... (jusqu'à 20)
   
   TÂCHE : identifie la meilleure formation du catalogue pour cette demande, et propose un devis structuré.
   
   Retourne UNIQUEMENT un JSON valide avec cette structure (pas de markdown, pas de commentaire) :
   {
     "formationId": "<id de la formation choisie>",
     "objet": "<objet professionnel pour le devis, ex: 'Formation SST initiale 14h - 5 stagiaires'>",
     "lignes": [
       { "designation": "<libellé de la ligne>", "quantite": <int>, "prixUnitaire": <float HT> }
     ],
     "rationale": "<1-2 phrases expliquant pourquoi cette formation correspond au besoin>"
   }
   ```
4. Appelle Claude (`askClaude` de `lib/ai.ts`) avec budget token modéré (~2000 max output)
5. Parse le JSON retourné (avec validation Zod stricte)
6. Si parse fail → return error, ne crée pas de devis
7. Sinon, crée `Devis` + `LigneDevis` + lie `Demande.devisId = devis.id` :
   ```ts
   await prisma.$transaction(async (tx) => {
     const devis = await tx.devis.create({
       data: {
         numero: <generated>,
         objet: aiOutput.objet,
         montantHT, tauxTVA: 20, montantTTC,
         dateEmission: new Date(),
         dateValidite: <+30j>,
         statut: "brouillon",
         entrepriseId: demande.entrepriseId,
         contactId: demande.contactId,
         notes: "Devis généré par IA depuis la Demande #" + demandeId + "\n\nJustification IA : " + aiOutput.rationale,
         lignes: { create: aiOutput.lignes.map(...) },
       },
     });
     await tx.demande.update({
       where: { id: demandeId },
       data: { devisId: devis.id, formationId: aiOutput.formationId },
     });
     return devis.id;
   });
   ```
8. `notifyAdmins({ titre: "Devis brouillon généré par IA", message: ..., lien: "/commercial/devis/<id>" })` + `logAction(...)`

#### `lib/validations/ai-devis-output.ts` (nouveau)

Schéma Zod pour valider la réponse IA :

```ts
export const aiDevisOutputSchema = z.object({
  formationId: z.string().cuid(),
  objet: z.string().min(5).max(200),
  lignes: z.array(z.object({
    designation: z.string().min(1),
    quantite: z.number().int().positive(),
    prixUnitaire: z.number().nonnegative(),
  })).min(1),
  rationale: z.string().max(500),
});
```

#### `app/api/demandes/[id]/route.ts` (modify)

Dans le PATCH handler :
- Détecter `oldStatut === "nouveau" && newStatut === "qualifie"`
- Si pas de `devisId` existant sur la Demande :
  - Appeler `generateDevisFromDemandeWithAI(demandeId)` (await)
  - Inclure le résultat dans la réponse : `{ statut, ai: { generated, devisId?, error? } }`

#### UI — fiche Demande

Sur la page `app/demandes/[id]/page.tsx` (déjà existante), modifier le handler de changement de statut :
- Si transition vers `qualifie` ET pas de devis : afficher modal de confirmation
- À la réponse API : si `ai.generated === true` → toast avec lien vers le devis
- Si `ai.error` → toast warning "Génération IA échouée — créez le devis manuellement"

#### Tests

- `tests/lib/generate-devis-from-demande.test.ts` :
  - Mock `askClaude` retourne JSON valide → vérifie création Devis + lignes + lien Demande.devisId
  - Mock `askClaude` retourne JSON invalide → return error, pas de devis créé
  - Mock `askClaude` throw → return error
  - Demande sans entreprise → return error explicite

---

## Hors scope (futur)

- **Multi-formation** : si la demande nécessite un package (ex: SST + recyclage), aujourd'hui on retient 1 seule formation. L'admin enrichit ensuite.
- **Multi-suggestion IA** : afficher 2-3 alternatives à l'admin. Plus complexe UX. Pour Phase 2 on retient juste la "meilleure".
- **Envoi auto au client** : l'admin reste maître (review + clic envoi).
- **Phase 3** : auto-envoi fiches pré-formation post-signature devis (spec séparée).
- **IA enrichissement contenu après création** : amélioration des notes commerciales, conditions, etc.
- **Apprentissage** : feedback admin (devis IA accepté/refusé) pour fine-tuner les prompts → futur ML.

---

## Critères d'acceptation

- [ ] `npx tsc --noEmit` : 0 erreur
- [ ] `npm test` : tous les tests passent (81 actuels post-Phase 1 + nouveaux)
- [ ] Tests : `generateDevisFromDemandeWithAI` (4 scénarios)
- [ ] PATCH `/api/demandes/[id]` retourne `{ ai }` quand transition `nouveau→qualifie` sans devis existant
- [ ] UI : modal de confirmation avant transition (pour cette transition uniquement)
- [ ] Smoke test : créer une Demande, qualifier → vérifier qu'un Devis brouillon est créé avec lignes pré-remplies
- [ ] Si AI down (mock simulant un échec) → statut Demande change mais devis non créé, toast warning
- [ ] Pas de doublon : si on re-qualifie une Demande déjà liée à un devis → pas de re-génération

---

## Risques et mitigations

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| AI hallucine un formationId inexistant | Moyenne | Validation Zod (`cuid`) + check `prisma.formation.findUnique` avant création Devis ; si invalide → return error |
| AI retourne JSON malformé | Moyenne | Zod parse strict ; sur fail → log + return error, pas de devis créé |
| Coût Claude par génération | Faible | ~$0.02-0.05/génération avec Claude Sonnet ; admin contrôle (modal confirm) ; `ai-guard.ts` pour rate-limit |
| Timeout Anthropic (latence > 30s) | Faible | Timeout côté `askClaude` (déjà en place) → fallback graceful |
| Génération bloque le PATCH statut | Moyenne | Faire l'appel AI **dans** le PATCH (sync, attendu par l'admin) avec timeout 15s. Si timeout → statut updated, message "IA en cours, devis suivra par notification" (mais MVP : sync simple, on accepte attente 5-10s pour l'admin) |
| Génération de doublons si admin re-qualifie | Faible | Check `Demande.devisId === null` avant génération |

---

## Estimation

- **Code** :
  - `lib/ai/generate-devis-from-demande.ts` (~150 lignes)
  - `lib/validations/ai-devis-output.ts` (~30 lignes)
  - Modify `app/api/demandes/[id]/route.ts` (~30 lignes ajoutées)
  - Modify `app/demandes/[id]/page.tsx` (~40 lignes : modal confirm + handle response)
  - Tests (~150 lignes)
- **Temps** : 3-4h dev avec tests
- **Risque** : moyen (intégration AI nouvelle, mais pattern existant `lib/ai.ts`)

---

## Pré-requis

- [x] PR #101 (Phase 1) mergée dans main (`e016667`)
- [x] `ANTHROPIC_API_KEY` configuré en prod Netlify (déjà en place)
- [x] `lib/ai.ts` (`askClaude`, `checkAIKey`) + `lib/ai-guard.ts` (rate-limit) existants

---

## Étapes suivantes

1. ✅ Spec écrite + commitée
2. ⏳ Plan d'implémentation (skill writing-plans)
3. ⏳ Exécution sur branche `feat/devis-auto-ai-from-demande`
4. ⏳ Tests, PR, smoke test
