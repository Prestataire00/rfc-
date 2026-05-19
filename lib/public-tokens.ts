// Audit 2026-05-19 §P2 — Infrastructure pour hasher les tokens publics.
//
// Aujourd'hui, les tokens publics (Session.tokenInscription,
// FichePreFormationStagiaire.tokenAcces, etc.) sont stockés EN CLAIR
// dans la DB. Si un attaquant exfiltre la table, il a tous les liens
// magiques actifs (ouverture de session.tokenInscription = inscription
// publique à la formation au nom de n'importe qui).
//
// Le pattern HMAC + tokenHash existe déjà pour les signatures électroniques
// (cf. lib/signatures/token.ts) où le fullToken n'est jamais stocké, seul
// son hash SHA-256 l'est. On veut reproduire ce pattern pour les tokens
// publics.
//
// MIGRATION PROGRESSIVE (à faire dans un PR dédié) :
//
// 1. Ajouter une colonne `tokenAccesHash String? @unique` à côté de
//    `tokenAcces` sur les 4 modèles (Session, FichePreFormationStagiaire,
//    FichePreFormationEntreprise, FicheBesoinStagiaire).
//
// 2. Pour chaque token existant en DB :
//    UPDATE table SET tokenAccesHash = sha256(tokenAcces);
//    (script de migration one-shot, à lancer une fois en prod)
//
// 3. Les routes publiques GET/POST qui lisent un token (ex:
//    /api/inscription-publique/[token]) :
//    - Avant : where: { tokenInscription: params.token }
//    - Après : where: { tokenAccesHash: hashPublicToken(params.token) }
//
// 4. Les routes admin qui GÉNÈRENT un nouveau token :
//    - Génère un token aléatoire fullToken
//    - Stocke en DB : tokenAccesHash = hashPublicToken(fullToken)
//    - Le fullToken n'est JAMAIS écrit en DB
//    - Le fullToken n'est renvoyé QU'UNE SEULE FOIS (dans la réponse
//      de création), construit dans le lien email/QR
//
// 5. Après la stabilisation : DROP COLUMN tokenAcces sur les 4 tables.
//
// Pour l'instant, les helpers ci-dessous sont prêts à être utilisés
// quand on lance la migration.

import { createHash, randomBytes } from "node:crypto";

/**
 * Hash un token public en SHA-256 pour stockage DB.
 * Le hash n'est pas réversible — utilisé pour le lookup à la lecture.
 *
 * @example
 *   const fullToken = generatePublicToken();
 *   await prisma.session.create({
 *     data: { tokenAccesHash: hashPublicToken(fullToken), ... }
 *   });
 *   // Envoyer ${baseUrl}/inscription/${fullToken} dans l'email
 */
export function hashPublicToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Génère un token public aléatoire URL-safe (32 octets = 256 bits d'entropie).
 * Format : 43 caractères base64url-safe (pas de +, /, =).
 */
export function generatePublicToken(): string {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Vérifie qu'un token reçu (depuis l'URL) correspond au hash stocké en DB.
 * Comparaison de strings simple — pas besoin de timingSafeEqual ici car le
 * hash en DB est lui-même issu d'une fonction one-way (le revealer ne peut
 * pas extraire le secret).
 *
 * @example
 *   const stored = await prisma.session.findFirst({
 *     where: { tokenAccesHash: hashPublicToken(params.token) }
 *   });
 *   if (!stored) return 404;
 */
export function publicTokenMatches(receivedToken: string, storedHash: string): boolean {
  return hashPublicToken(receivedToken) === storedHash;
}
