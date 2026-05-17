// Génération auto d'un devis brouillon via Claude IA à partir d'une Demande.
// Trigger : transition Demande.statut nouveau→qualifie (cf. PATCH /api/demandes/[id]).
// Cf. docs/superpowers/specs/2026-05-16-devis-auto-ia-phase-2-design.md
//
// Adaptation vs plan : askClaude est appelé avec { noMarkdown: false } pour
// préserver le JSON brut (sinon cleanAIResponse() supprimerait les accolades/virgules).

import { prisma } from "@/lib/prisma";
import { askClaude, checkAIKey } from "@/lib/ai";
import { aiDevisOutputSchema } from "@/lib/validations/ai-devis-output";
import { notifyAdmins } from "@/lib/notifications";
import { logAction } from "@/lib/historique";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { logger } from "@/lib/logger";

export type GenerateResult = { devisId: string } | { error: string };

export async function generateDevisFromDemandeWithAI(
  demandeId: string,
): Promise<GenerateResult> {
  if (!checkAIKey()) {
    return { error: "Clé Anthropic non configurée" };
  }

  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: {
      entreprise: true,
      contact: true,
    },
  });
  if (!demande) return { error: "Demande introuvable" };
  if (demande.devisId) return { error: "Cette demande est déjà liée à un devis (id " + demande.devisId + ")" };
  // entrepriseId facultatif : un stagiaire individuel n'a pas d'entreprise rattachée.
  // Dans ce cas, le devis sera lié uniquement au contact.
  if (!demande.entrepriseId && !demande.contactId) {
    return { error: "La demande n'a ni entreprise ni contact associé" };
  }

  const formations = await prisma.formation.findMany({
    where: { actif: true },
    select: {
      id: true,
      titre: true,
      description: true,
      duree: true,
      tarif: true,
      categorie: true,
      certifiante: true,
    },
    orderBy: { titre: "asc" },
    take: 20,
  });
  if (formations.length === 0) {
    return { error: "Catalogue de formations vide" };
  }

  const prompt = buildPrompt(demande, formations);

  let rawResponse: string;
  try {
    // noMarkdown: false pour préserver le JSON brut (cleanAIResponse() enlèverait {} etc.)
    rawResponse = await askClaude(prompt, 2000, { noMarkdown: false });
  } catch (err) {
    logger.error("ai.generate-devis.claude-call-failed", err);
    return { error: "Erreur appel IA : " + (err instanceof Error ? err.message : String(err)) };
  }

  // Extraire le JSON de la réponse (Claude peut mettre du texte autour)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { error: "Réponse IA sans JSON détectable" };
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonMatch[0]);
  } catch {
    return { error: "JSON IA malformé" };
  }
  const validation = aiDevisOutputSchema.safeParse(parsedJson);
  if (!validation.success) {
    logger.warn("ai.generate-devis.zod-validation-failed", { errors: validation.error.flatten() });
    return { error: "Structure JSON IA invalide" };
  }
  const aiOutput = validation.data;

  // Vérifier que la formation choisie existe vraiment
  const formationOk = await prisma.formation.findUnique({
    where: { id: aiOutput.formationId },
    select: { id: true },
  });
  if (!formationOk) {
    return { error: "L'IA a proposé une formation inexistante (id " + aiOutput.formationId + ")" };
  }

  // Numérotation devis
  const allDevis = await prisma.devis.findMany({ select: { numero: true } });
  const maxNum = allDevis.reduce((m, d) => {
    const n = parseInt(d.numero.split("-").pop() || "0");
    return n > m ? n : m;
  }, 0);
  const numero = generateNumero("DEV", maxNum);

  const montantHT = aiOutput.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const tauxTVA = 20;
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  const dateValidite = new Date();
  dateValidite.setDate(dateValidite.getDate() + 30);

  const result = await prisma.$transaction(async (tx) => {
    const devis = await tx.devis.create({
      data: {
        numero,
        objet: aiOutput.objet,
        montantHT,
        tauxTVA,
        montantTTC,
        dateEmission: new Date(),
        dateValidite,
        statut: "brouillon",
        // entrepriseId nullable : stagiaire individuel n'a pas d'entreprise
        entrepriseId: demande.entrepriseId ?? null,
        contactId: demande.contactId,
        notes: `Devis brouillon généré par IA depuis la Demande #${demande.id}.\n\nJustification IA : ${aiOutput.rationale}`,
        lignes: {
          create: aiOutput.lignes.map((l) => ({
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            montant: l.quantite * l.prixUnitaire,
          })),
        },
      },
      select: { id: true },
    });
    await tx.demande.update({
      where: { id: demande.id },
      data: { devisId: devis.id, formationId: aiOutput.formationId },
    });
    return { devisId: devis.id };
  });

  // Notif + log (hors transaction)
  const clientLabel = demande.entreprise?.nom || (demande.contact ? `${demande.contact.prenom} ${demande.contact.nom}` : "Client");
  await notifyAdmins({
    titre: "Devis brouillon généré par IA",
    message: `${clientLabel} — ${numero} (${formatCurrency(montantTTC)}) à réviser avant envoi`,
    type: "info",
    lien: `/commercial/devis/${result.devisId}`,
  }).catch((err) => logger.warn("ai.generate-devis.notify-failed", { error: String(err) }));

  await logAction({
    action: "devis_genere_ia",
    label: `Devis ${numero} généré par IA depuis demande #${demande.id}`,
    lien: `/commercial/devis/${result.devisId}`,
    entrepriseId: demande.entrepriseId ?? undefined,
    contactId: demande.contactId ?? undefined,
    devisId: result.devisId,
  }).catch((err) => logger.warn("ai.generate-devis.log-failed", { error: String(err) }));

  return result;
}

function buildPrompt(
  demande: {
    titre: string;
    description: string | null;
    notes: string | null;
    nbStagiaires: number | null;
    budget: number | null;
    sourceContact: string | null;
    entreprise: { nom: string; secteur: string | null; effectif: number | null; typeEntreprise: string | null } | null;
    contact: { nom: string; prenom: string; poste: string | null } | null;
  },
  formations: Array<{ id: string; titre: string; description: string | null; duree: number; tarif: number; categorie: string | null; certifiante: boolean }>,
): string {
  const ent = demande.entreprise;
  const ct = demande.contact;
  const catalogueLines = formations
    .map((f) => `- [${f.id}] ${f.titre} | durée ${f.duree}h | tarif ${f.tarif}€ HT par stagiaire | catégorie ${f.categorie ?? "—"} | ${f.certifiante ? "CERTIFIANTE" : "non certifiante"} | ${(f.description ?? "").slice(0, 200)}`)
    .join("\n");

  // Adapte le bloc CLIENT selon B2B (entreprise) ou B2C (stagiaire individuel)
  const clientBlock = ent
    ? `CONTEXTE CLIENT (B2B) :
- Entreprise: ${ent.nom}, secteur ${ent.secteur ?? "—"}, effectif ${ent.effectif ?? "—"}, type ${ent.typeEntreprise ?? "—"}
- Contact décideur: ${ct ? `${ct.prenom} ${ct.nom}` : "—"}, poste ${ct?.poste ?? "—"}`
    : `CONTEXTE CLIENT (B2C - stagiaire individuel, pas d'entreprise rattachée) :
- Stagiaire: ${ct ? `${ct.prenom} ${ct.nom}` : "—"}${ct?.poste ? ` (employeur indiqué : ${ct.poste})` : ""}`;

  const defaultStagiaires = ent ? "non précisé" : "1 (stagiaire individuel)";

  return `Tu es un assistant pour un organisme de formation (sécurité, incendie, premiers secours).
Un prospect demande une formation. Voici le contexte :

${clientBlock}

DEMANDE:
- Titre: ${demande.titre}
- Description: ${demande.description ?? "—"}
- Notes: ${demande.notes ?? "—"}
- Nombre de stagiaires souhaité: ${demande.nbStagiaires ?? defaultStagiaires}
- Budget envisagé: ${demande.budget ? demande.budget + " € HT" : "non précisé"}
- Source du contact: ${demande.sourceContact ?? "—"}

CATALOGUE DISPONIBLE (${formations.length} formations actives) :
${catalogueLines}

TÂCHE : identifie la meilleure formation du catalogue pour cette demande, et propose un devis structuré.
- Si le nombre de stagiaires n'est pas précisé : 1 par défaut.
- Si le budget est précisé et incompatible avec le tarif catalogue × nbStagiaires, propose la formation quand même au tarif standard (l'admin négociera).
${ent ? "" : "- Cas stagiaire individuel : le devis est nominatif, quantité = 1 sur la ligne principale.\n"}
Retourne UNIQUEMENT un JSON valide avec cette structure (pas de markdown, pas de commentaire, pas de texte autour) :
{
  "formationId": "<id exact de la formation choisie depuis le catalogue>",
  "objet": "<objet professionnel du devis, ex: 'Formation SST initiale 14h - 5 stagiaires'>",
  "lignes": [
    { "designation": "<libellé clair de la ligne>", "quantite": <int positif>, "prixUnitaire": <float HT> }
  ],
  "rationale": "<1-2 phrases expliquant pourquoi cette formation correspond au besoin (max 500 caractères)>"
}`;
}
