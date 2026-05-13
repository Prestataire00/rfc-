/**
 * Validation des PDFs uploadés avant stockage.
 *
 * Refuse :
 * - Fichiers trop gros (SIGNATURE_MAX_FILE_SIZE_MB, défaut 25)
 * - Magic bytes non-PDF
 * - PDFs avec >SIGNATURE_MAX_PAGES (défaut 50) → anti-DoS rendu
 * - PDFs avec JavaScript embarqué (/JS, /JavaScript, /OpenAction) → anti-XSS
 *
 * Note : ces vérifs sont applicatives (défense en profondeur).
 * La validation MIME côté Supabase Storage doit aussi être configurée.
 */
import { PDFDocument } from "pdf-lib";

export const MAX_PDF_SIZE_BYTES =
  (Number(process.env.SIGNATURE_MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;

export const MAX_PDF_PAGES = Number(process.env.SIGNATURE_MAX_PAGES) || 50;

export type ValidationResult = { pageCount: number };

export async function validatePdfBuffer(buf: Buffer): Promise<ValidationResult> {
  if (buf.length > MAX_PDF_SIZE_BYTES) {
    throw new Error(
      `PDF trop volumineux (max ${MAX_PDF_SIZE_BYTES / 1024 / 1024} Mo)`,
    );
  }
  if (buf.length < 5 || buf.slice(0, 5).toString() !== "%PDF-") {
    throw new Error("Fichier invalide : magic bytes PDF manquants");
  }

  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(buf, { ignoreEncryption: false });
  } catch (e) {
    throw new Error(`PDF illisible : ${(e as Error).message}`);
  }

  const pageCount = pdf.getPageCount();
  if (pageCount > MAX_PDF_PAGES) {
    throw new Error(`PDF trop long (max ${MAX_PDF_PAGES} pages, reçu ${pageCount})`);
  }

  // Anti-XSS basique : on rejette les PDFs avec des actions JavaScript embarquées.
  // Pas exhaustif mais bloque les vecteurs courants. Le PDF ne sera jamais exécuté
  // côté serveur (juste parsé en lecture), donc c'est une défense en profondeur.
  const raw = buf.toString("latin1");
  if (/\/JavaScript\b|\/JS\b|\/OpenAction\b/.test(raw)) {
    throw new Error("PDF rejeté : contient des actions JavaScript");
  }

  return { pageCount };
}
