export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askClaude, checkAIKey } from "@/lib/ai";

export async function POST(req: NextRequest) {
  if (!checkAIKey()) return NextResponse.json({ error: "Cle Anthropic manquante" }, { status: 500 });
  try {
    const body = await req.json();
    const { action, titre, description, origine, nbStagiaires, contactId, entrepriseId } = body;

    let contexte = `Besoin : ${titre || "Non precise"}`;
    if (description) contexte += `\nDescription : ${description}`;
    if (origine) contexte += `\nOrigine : ${origine}`;
    if (nbStagiaires) contexte += `\nNombre de stagiaires : ${nbStagiaires}`;

    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { entreprise: { select: { nom: true, secteur: true } } },
      });
      if (contact) {
        contexte += `\nContact : ${contact.prenom} ${contact.nom}`;
        if (contact.poste) contexte += ` (${contact.poste})`;
        if (contact.entreprise) {
          contexte += `\nEntreprise : ${contact.entreprise.nom}`;
          if (contact.entreprise.secteur) contexte += ` - Secteur : ${contact.entreprise.secteur}`;
        }
      }
    } else if (entrepriseId) {
      const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
      if (entreprise) {
        contexte += `\nEntreprise : ${entreprise.nom}`;
        if (entreprise.secteur) contexte += ` - Secteur : ${entreprise.secteur}`;
      }
    }

    if (action === "suggerer_formations") {
      const formations = await prisma.formation.findMany({
        where: { actif: true, statut: "publiee" },
        select: { id: true, titre: true, categorie: true, duree: true, tarif: true, niveau: true },
      });
      const catalogue = formations.map((f) => `- ${f.titre} (${f.categorie || "-"}) - ${f.duree}h - ${f.tarif}EUR - ${f.niveau}`).join("\n");

      const prompt = `Tu es un conseiller en formation expert. En fonction du besoin ci-dessous, propose les 3 formations les plus pertinentes de notre catalogue, en justifiant brievement chaque choix.

IMPORTANT : reponds en texte brut, sans aucun formatage Markdown (pas de **, pas de ##, pas de ---, pas de puces *). Utilise des tirets simples (-) pour les listes et des sauts de ligne pour separer les sections.

${contexte}

Catalogue disponible :
${catalogue}

Pour chaque formation recommandee, indique :
- Le titre
- La justification en 1-2 phrases`;

      const text = await askClaude(prompt, 1500);
      return NextResponse.json({ text: stripMarkdown(text) });
    }

    if (action === "brief") {
      const prompt = `Tu es un expert en ingenierie pedagogique. A partir du besoin decrit, redige un brief de formation complet et professionnel, en francais.

IMPORTANT : reponds en texte brut uniquement, sans aucun formatage Markdown (pas de **, pas de ##, pas de ---, pas de puces *, pas de backticks). Utilise des tirets simples (-) pour les listes et des sauts de ligne pour structurer.

${contexte}

Structure ta reponse ainsi :

Titre suggere : ...

Objectifs pedagogiques :
- ...
- ...

Public cible : ...

Modalite recommandee : (presentiel / distanciel / mixte)

Duree estimee : ...h

Prerequis : ...`;

      const text = await askClaude(prompt, 1500);
      return NextResponse.json({ text: stripMarkdown(text) });
    }

    // Analyse par defaut
    const prompt = `Tu es un consultant en formation. Analyse ce besoin exprime par un client et fournis une analyse structuree, en francais.

IMPORTANT : reponds en texte brut uniquement, sans aucun formatage Markdown (pas de **, pas de ##, pas de ---, pas de puces *, pas de backticks). Utilise des tirets simples (-) pour les listes et des sauts de ligne pour structurer.

${contexte}

Reponds avec :

1. Synthese du besoin (2-3 phrases)

2. Competences visees
- ...

3. Enjeux identifies
- ...

4. Questions a poser au client pour affiner
- ...

5. Type de formation recommande : ...`;

    const text = await askClaude(prompt, 1500);
    return NextResponse.json({ text: stripMarkdown(text) });
  } catch (err: unknown) {
    console.error("AI besoin error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur IA" }, { status: 500 });
  }
}

// Nettoyage de securite : retire le Markdown residuel si Claude en met quand meme
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")     // **bold** -> bold
    .replace(/\*([^*]+)\*/g, "$1")          // *italic* -> italic
    .replace(/^#{1,6}\s+/gm, "")            // ## heading -> heading
    .replace(/^---+$/gm, "")                // --- separators
    .replace(/```[\s\S]*?```/g, "")         // code blocks
    .replace(/`([^`]+)`/g, "$1")            // inline code
    .replace(/^\* /gm, "- ")               // * bullets -> - bullets
    .replace(/\n{3,}/g, "\n\n")            // collapse multiple blank lines
    .trim();
}
