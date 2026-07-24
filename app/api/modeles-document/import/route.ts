// POST /api/modeles-document/import
//
// Importe un document (PDF, Word .docx, image, ou texte), en extrait le
// contenu, puis demande à l'IA de le transformer en MODÈLE réutilisable avec
// des variables {{...}} — enregistré comme ModeleDocumentIA. Le document devient
// ainsi générable par client (via /render-for-contact).
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { askClaude, askClaudeVision, checkAIKey, normalizeVisionMediaType } from "@/lib/ai";
import { modeleDocumentAiOutputSchema } from "@/lib/validations/modele-document";
import { logger } from "@/lib/logger";

const MAX_SIZE = 10 * 1024 * 1024;

// Variables réellement remplies par le moteur (cf. render-for-contact).
const VARIABLES_DISPONIBLES = `
- Stagiaire : {{stagiaire.civilite}}, {{stagiaire.prenom}}, {{stagiaire.nom}}, {{stagiaire.email}}, {{stagiaire.telephone}}, {{stagiaire.sexe}}, {{stagiaire.dateNaissance}}, {{stagiaire.lieuNaissance}}, {{stagiaire.pays}}, {{stagiaire.adresse}}, {{stagiaire.codePostal}}, {{stagiaire.ville}}, {{stagiaire.numeroCartePro}}, {{stagiaire.numeroFranceTravail}}, {{stagiaire.diplomeObtenu}}
- Formation : {{formation.titre}}, {{formation.duree}}, {{formation.objectifs}}
- Session : {{session.dateDebut}}, {{session.dateFin}}, {{session.lieu}}
- Formateur : {{formateur.prenom}}, {{formateur.nom}}
- Organisme : {{entreprise.nomEntreprise}}, {{entreprise.adresse}}, {{entreprise.codePostal}}, {{entreprise.ville}}, {{entreprise.telephone}}, {{entreprise.email}}, {{entreprise.siret}}, {{entreprise.nda}}, {{entreprise.representant}}
- Entreprise du stagiaire : {{societe.nom}}, {{societe.adresse}}, {{societe.ville}}, {{societe.siret}}
- Divers : {{date.aujourdhui}}`.trim();

function buildTemplatizePrompt(texte: string): string {
  return `Tu es un assistant pour un organisme de formation. Voici le CONTENU d'un document existant :

"""
${texte.slice(0, 12000)}
"""

TÂCHE : transforme ce document en MODÈLE réutilisable pour plusieurs destinataires.
Remplace les données personnalisées (nom du stagiaire, dates, intitulé de formation, lieu, formateur, coordonnées…) par des variables au format {{categorie.champ}}.
N'utilise QUE des variables de cette liste (sinon elles resteront vides) :
${VARIABLES_DISPONIBLES}
Conserve la structure et le texte du document d'origine ; ne change que les valeurs personnalisées en variables.

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) :
{
  "titre": "<titre du document>",
  "introduction": "<intro/objet, peut être vide>",
  "corps": "<corps complet ; sauts de ligne réels ; variables {{...}} intégrées>",
  "mentions": "<mentions légales/pied de page, peut être vide>",
  "variables": [ { "nom": "<ex: stagiaire.nom>", "description": "<rôle>" } ]
}`;
}

async function extractText(file: File, buffer: Buffer): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "text/plain" || name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it: unknown) => (typeof (it as { str?: unknown }).str === "string" ? (it as { str: string }).str : "")).join(" "));
    }
    await doc.cleanup();
    await doc.destroy();
    return parts.join("\n\n");
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    const mediaType = normalizeVisionMediaType(type);
    return await askClaudeVision(
      buffer.toString("base64"),
      mediaType,
      "Transcris FIDÈLEMENT tout le texte visible de ce document, en conservant la structure (titres, paragraphes, listes). Ne commente pas, retourne uniquement le texte.",
    );
  }
  throw new Error("UNSUPPORTED");
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user || authSession.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!checkAIKey()) {
    return NextResponse.json({ error: "Clé Anthropic non configurée (import IA indisponible)" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} MB)` }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1) Extraction du texte selon le format.
  let texte: string;
  try {
    texte = (await extractText(file, buffer))
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  } catch (err) {
    if (err instanceof Error && err.message === "UNSUPPORTED") {
      return NextResponse.json(
        { error: "Format non supporté. Formats acceptés : PDF, Word (.docx), image (PNG/JPG), texte (.txt)." },
        { status: 415 },
      );
    }
    logger.warn("modele-import.extract-failed", { name: file.name, error: String(err) });
    return NextResponse.json({ error: "Impossible de lire ce fichier (fichier corrompu ou protégé)." }, { status: 422 });
  }

  if (!texte || texte.length < 10) {
    return NextResponse.json(
      { error: "Aucun texte exploitable détecté (document vide ou scanné illisible)." },
      { status: 422 },
    );
  }

  // 2) L'IA transforme le contenu en modèle avec variables.
  let raw: string;
  try {
    raw = await askClaude(buildTemplatizePrompt(texte), 3000, { noMarkdown: false });
  } catch (err) {
    logger.error("modele-import.claude-failed", err);
    return NextResponse.json({ error: "Erreur lors de la transformation IA" }, { status: 502 });
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Réponse IA sans JSON détectable" }, { status: 422 });
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "JSON IA malformé" }, { status: 422 });
  }
  const validation = modeleDocumentAiOutputSchema.safeParse(parsedJson);
  if (!validation.success) {
    return NextResponse.json({ error: "Structure JSON IA invalide", issues: validation.error.issues }, { status: 422 });
  }
  const out = validation.data;

  // 3) Enregistre le modèle réutilisable.
  const nomBase = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Document importé";
  const modele = await prisma.modeleDocumentIA.create({
    data: {
      nom: nomBase,
      description: `Importé depuis ${file.name} et adapté automatiquement (variables).`,
      titre: out.titre,
      introduction: out.introduction ?? null,
      corps: out.corps,
      mentions: out.mentions ?? null,
      variables: JSON.stringify(out.variables ?? []),
    },
  });

  return NextResponse.json({ ok: true, modele }, { status: 201 });
});
