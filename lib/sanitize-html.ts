// Sanitization HTML rich text — défense contre XSS quand on stocke du HTML
// produit par TipTap (ou d'autres éditeurs). À appeler systématiquement
// AVANT insert/update en BD.
//
// Whitelist stricte : seuls les tags et attributs produits par notre
// RichEditor (b/strong, i/em, u, span style=color) passent. Les autres sont
// strippés.
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "p", "br", "span"];
const ALLOWED_ATTR = ["style"];

// La regex sur "style" autorise uniquement `color: #xxx` ou `color: rgb(...)`
// — pas d'expression CSS arbitraire qui pourrait être exploitée.
const ALLOWED_STYLE_PATTERN = /^color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([0-9,\s.%]+\))$/;

export function sanitizeRichHtml(html: string): string {
  // Pré-filtrage simple : si trop volumineux, on refuse direct (anti-DoS).
  if (html.length > 50_000) {
    throw new Error("Contenu trop volumineux (max 50 Ko)");
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Nettoyage post-sanitize : supprime tout style qui ne match pas notre pattern.
    // DOMPurify v3 expose `uponSanitizeAttribute` via hooks ; on fait un check
    // côté caller en V1 pour rester portable. Pas de hook nécessaire car
    // ALLOWED_ATTR ne contient que `style` et on filtre derrière.
  });
}

// Filtre additionnel sur les style "color" : à appeler après sanitizeRichHtml
// pour bloquer les valeurs CSS suspectes. Pour V1 simple, on regex sur le HTML
// final et on supprime les attributs style non conformes.
export function filterColorStyles(html: string): string {
  return html.replace(/style="([^"]*)"/g, (match, style: string) => {
    const trimmed = style.trim();
    if (!trimmed) return "";
    if (ALLOWED_STYLE_PATTERN.test(trimmed)) {
      return `style="${trimmed}"`;
    }
    return ""; // strip silencieusement
  });
}

export function safeRichHtml(input: string): string {
  return filterColorStyles(sanitizeRichHtml(input));
}
