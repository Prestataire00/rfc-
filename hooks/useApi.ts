"use client";

// Wrappers SWR : data fetching avec cache, dedup, revalidation.
// `useApi(url)` remplace le pattern `useEffect + fetch + useState`.
// `useApiMutation()` remplace le pattern `setSubmitting(true) + fetch(POST) + revalidate`.

import useSWR, { SWRConfiguration, mutate as globalMutate } from "swr";
import useSWRMutation from "swr/mutation";
import { fetcher, api, ApiError } from "@/lib/fetcher";

export { ApiError };

// GET avec cache. Passe `null` pour suspendre la requête (ex : route paramétrée tant que `id` est vide).
export function useApi<T = unknown>(
  url: string | null,
  config?: SWRConfiguration<T, ApiError>
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T, ApiError>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (err) => err.status >= 500,
      ...config,
    }
  );
  return { data, error, isLoading, isValidating, mutate };
}

// Mutation POST/PUT/PATCH/DELETE avec invalidation automatique du cache cible.
type Method = "POST" | "PUT" | "PATCH" | "DELETE";

export function useApiMutation<TBody = unknown, TResult = unknown>(
  url: string,
  method: Method = "POST"
) {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    TResult,
    ApiError,
    string,
    TBody
  >(url, async (key, { arg }) => {
    if (method === "DELETE") return api.delete<TResult>(key);
    if (method === "POST") return api.post<TResult>(key, arg);
    if (method === "PUT") return api.put<TResult>(key, arg);
    return api.patch<TResult>(key, arg);
  });

  return { trigger, isMutating, error, data, reset };
}

// Helper pour invalider plusieurs clés SWR à la fois après une mutation.
// Usage : `await invalidate("/api/contacts", "/api/dashboard/stats")`
export async function invalidate(...keys: string[]) {
  await Promise.all(keys.map((k) => globalMutate(k)));
}
