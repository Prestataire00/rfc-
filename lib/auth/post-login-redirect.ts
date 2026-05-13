/**
 * Helpers de redirection post-login partagés entre callback Supabase
 * et autres flux d'authentification.
 */

export function destinationByRole(role: string): string {
  if (role === "formateur") return "/espace-formateur";
  if (role === "client") return "/espace-client";
  return "/dashboard";
}

/**
 * Anti open-redirect : seuls les chemins relatifs internes (sans `//`) sont
 * autorisés. Tout `?next=https://evil.com` ou `?next=//evil.com` est rejeté.
 */
export function sanitizeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}
