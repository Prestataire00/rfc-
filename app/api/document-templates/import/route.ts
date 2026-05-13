export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withErrorHandler } from "@/lib/api-wrapper";

/**
 * POST /api/document-templates/import
 *
 * Reçoit un fichier (PDF ou texte brut) en multipart/form-data, extrait
 * le texte, et le retourne. L'appelant côté UI injecte ce texte dans le
 * champ "corps" du template — pas de persistance ici.
 *
 * Formats supportés
 * - text/plain (.txt) : lu tel quel
 * - application/pdf  (.pdf) : extrait via pdfjs-dist (déjà installé)
 *
 * Limite : 5 MB (un template texte est typiquement < 50 KB)
 */
const MAX_SIZE = 5 * 1024 * 1024;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let texte = "";
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    texte = buffer.toString("utf-8");
  } else if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    texte = await extractPdfText(buffer);
  } else {
    return NextResponse.json(
      {
        error:
          "Format non supporté. Utilise un PDF ou un fichier texte (.txt).",
      },
      { status: 415 },
    );
  }

  // Nettoyage léger : enlève les espaces multiples + sauts de ligne en trop
  texte = texte
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!texte) {
    return NextResponse.json(
      { error: "Le fichier ne contient aucun texte lisible." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    texte,
    longueur: texte.length,
    source: file.name,
  });
});

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist legacy build (node-friendly, pas besoin de canvas)
  // — déjà installé dans le projet pour le module signature.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data: uint8, useSystemFonts: true })
    .promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: unknown) => {
        const item = it as { str?: unknown };
        return typeof item.str === "string" ? item.str : "";
      })
      .join(" ");
    parts.push(text);
  }
  await doc.cleanup();
  await doc.destroy();
  return parts.join("\n\n");
}
