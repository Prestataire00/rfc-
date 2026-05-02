// Barrel file : re-exports the per-template PDF generators that used to live here.
// Splitting was done in Chantier 10 — see ./shared for the common helpers.
export { conventionPdf } from "./convention";
export { attestationPdf } from "./attestation";
export { convocationPdf } from "./convocation";
export { devisPdf } from "./devis";
export { facturePdf } from "./facture";
export { feuillePresencePdf } from "./feuille-presence";
export { bpfPdf } from "./bpf";
// Re-export shared types so callers that imported from `templates` keep working.
export type { PdfOpts } from "./shared";
