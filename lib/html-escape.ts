// Helper Audit 2026-05-19 §P2 — escape HTML pour les interpolations dans
// les templates email (lib/email.ts) et autres endroits où on assemble du
// HTML à la main avec des données utilisateur (badge.nom, contact.prenom,
// devis.objet, etc.).
//
// Sans escape, un nom contenant "<script>" ou "&" est rendu littéralement
// dans le mail HTML — XSS dans certains clients mails + casse l'affichage.
// Avec escape, les caractères spéciaux deviennent des entités HTML inertes.

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Escape les caractères HTML spéciaux pour une utilisation safe dans un
 * template HTML interpolé. À utiliser sur toute donnée provenant de
 * l'utilisateur ou de la DB (nom, prénom, email, objet, etc.).
 *
 * @example
 *   `<p>Bonjour ${escapeHtml(contact.prenom)}</p>`
 */
export function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] || c);
}

/**
 * Tag template literal pour escape automatique des interpolations.
 * Pratique pour éviter d'oublier escapeHtml sur chaque ${var}.
 *
 * @example
 *   const html = safeHtml`<p>Bonjour ${name}, voici ${objet}</p>`;
 *   // name et objet sont automatiquement escapés
 */
export function safeHtml(
  strings: TemplateStringsArray,
  ...values: Array<string | number | null | undefined>
): string {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += escapeHtml(values[i]) + strings[i + 1];
  }
  return result;
}
