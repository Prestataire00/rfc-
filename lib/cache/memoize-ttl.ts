/**
 * Cache mémoire process-local avec TTL.
 *
 * Pour des données de dashboard / KPI qui changent peu (CA mois, nb
 * contacts, etc.) — éviter de re-frapper la DB à chaque page reload.
 *
 * Limitations volontaires
 *   - Pas distribué : chaque instance Netlify a son propre cache. Pour 1
 *     dyno c'est OK ; pour N dynos, on accepte le risque de divergence
 *     (max TTL ms de désynchro). Suffisant pour des KPI.
 *   - Pas de purge active : les entrées expirées sont nettoyées au prochain
 *     get(). Une entrée orpheline coûte le poids d'une référence + un
 *     Date.now() — négligeable.
 *   - Pas de LRU : on suppose un nombre borné de clés (handfull de KPI
 *     par dashboard). Si quelqu'un l'utilise avec des clés non bornées,
 *     il faut un LRU au-dessus.
 *
 * Pas en server-only car le module est neutre — peut être utilisé côté
 * client aussi (cf SWR cache déjà en place, mais ici c'est différent).
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const stores = new Map<string, CacheEntry<unknown>>();

export type MemoizeOptions = {
  /** Durée de vie en millisecondes. */
  ttlMs: number;
  /** Identifiant de cache stable. Doit être unique par "clé sémantique". */
  key: string;
  /** Fournisseur de date pour les tests. Default: Date.now. */
  now?: () => number;
};

/**
 * Retourne la valeur en cache si fraîche, sinon appelle `loader` et la met
 * en cache pour `ttlMs`. Si `loader` throw, le cache n'est PAS empoisonné.
 */
export async function memoizeWithTtl<T>(
  loader: () => Promise<T>,
  options: MemoizeOptions,
): Promise<T> {
  const now = options.now ? options.now() : Date.now();
  const existing = stores.get(options.key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const value = await loader();
  stores.set(options.key, { value, expiresAt: now + options.ttlMs });
  return value;
}

/**
 * Invalide une clé (utile après une mutation qui sait que le cache est
 * stale).
 */
export function invalidate(key: string): void {
  stores.delete(key);
}

/**
 * Reset complet du store. À utiliser dans les tests UNIQUEMENT.
 */
export function _resetStoreForTests(): void {
  stores.clear();
}
