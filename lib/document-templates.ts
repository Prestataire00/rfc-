// Templates PDF par defaut. Chaque template a un titre, une introduction,
// un corps et des mentions. Ils sont seedes en base et modifiables via l'editeur.
// Les textes peuvent contenir des variables {{xxx.yyy}} remplacees au rendu.

import { prisma } from "@/lib/prisma";
import { applyVariables } from "@/lib/message-templates";

export type DocumentTemplateDefault = {
  id: string;
  type: string;
  nom: string;
  description: string;
  titre: string;
  introduction: string;
  corps: string;
  mentions: string;
  variables: { nom: string; description: string }[];
};

const VAR_COMMON = [
  { nom: "entreprise.nomEntreprise", description: "Nom de l'organisme de formation" },
  { nom: "entreprise.adresse", description: "Adresse siege" },
  { nom: "entreprise.siret", description: "Numero SIRET" },
  { nom: "entreprise.nda", description: "Numero de declaration d'activite" },
];
const VAR_FORMATION = [
  { nom: "formation.titre", description: "Titre de la formation" },
  { nom: "formation.duree", description: "Duree en heures" },
];
const VAR_SESSION = [
  { nom: "session.dateDebut", description: "Date de debut formatee" },
  { nom: "session.dateFin", description: "Date de fin formatee" },
  { nom: "session.lieu", description: "Lieu" },
];
const VAR_STAGIAIRE = [
  { nom: "stagiaire.prenom", description: "Prenom" },
  { nom: "stagiaire.nom", description: "Nom" },
];

export const DOCUMENT_TEMPLATE_DEFAULTS: DocumentTemplateDefault[] = [
  {
    id: "doc_convocation",
    type: "convocation",
    nom: "Convocation",
    description: "Document officiel envoye au stagiaire avant la formation.",
    titre: "Convocation a une formation",
    introduction: "Madame, Monsieur {{stagiaire.nom}},\n\nNous avons le plaisir de vous confirmer votre inscription a la formation suivante.",
    corps: "Formation : {{formation.titre}}\nDuree : {{formation.duree}} heures\nDates : du {{session.dateDebut}} au {{session.dateFin}}\nLieu : {{session.lieu}}\n\nMerci de vous presenter 10 minutes avant le debut de la premiere demi-journee munie d'une piece d'identite. Un reglement interieur vous sera remis a l'accueil.\n\nEn cas d'empechement, merci de nous prevenir au plus tot afin de nous permettre de reorganiser la session.",
    mentions: "{{entreprise.nomEntreprise}} — {{entreprise.adresse}}\nSIRET : {{entreprise.siret}} — Declaration d'activite : {{entreprise.nda}}",
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_SESSION, ...VAR_COMMON],
  },
  {
    id: "doc_convention",
    type: "convention",
    nom: "Convention de formation",
    description: "Convention de formation professionnelle continue (art. L.6353-1).",
    titre: "Convention de formation professionnelle",
    introduction: "Entre l'organisme de formation {{entreprise.nomEntreprise}}, ci-apres designe &laquo;le prestataire&raquo;, et le beneficiaire ci-apres designe.",
    corps: "Article 1 — Objet\nLa presente convention a pour objet la realisation de l'action de formation &laquo;{{formation.titre}}&raquo;.\n\nArticle 2 — Nature et duree\nDuree totale : {{formation.duree}} heures, du {{session.dateDebut}} au {{session.dateFin}}.\nModalite : presentiel.\nLieu : {{session.lieu}}.\n\nArticle 3 — Engagements\nLe prestataire s'engage a realiser les actions dans les conditions definies ci-dessus, a fournir les moyens pedagogiques et a delivrer une attestation de suivi a l'issue de la formation.\n\nArticle 4 — Prix et modalites\nLe prix de la prestation est indique sur le devis joint. Le reglement se fait selon les conditions du devis accepte.\n\nArticle 5 — Dedit ou abandon\nEn cas d'abandon moins de 7 jours avant le debut, 30% du montant reste du. En cas de force majeure dument reconnue, aucune penalite n'est appliquee.",
    mentions: "Fait en deux exemplaires originaux.\n\n{{entreprise.nomEntreprise}} — {{entreprise.adresse}}\nSIRET : {{entreprise.siret}} — NDA : {{entreprise.nda}}",
    variables: [...VAR_FORMATION, ...VAR_SESSION, ...VAR_COMMON],
  },
  {
    id: "doc_attestation",
    type: "attestation",
    nom: "Attestation de fin de formation",
    description: "Delivree au stagiaire apres la session.",
    titre: "Attestation de fin de formation",
    introduction: "Je soussigne, representant {{entreprise.nomEntreprise}}, atteste que :",
    corps: "{{stagiaire.prenom}} {{stagiaire.nom}}\n\na suivi l'action de formation :\n\n{{formation.titre}}\n\nD'une duree de {{formation.duree}} heures, qui s'est deroulee du {{session.dateDebut}} au {{session.dateFin}}.\n\nL'ensemble des objectifs pedagogiques ont ete atteints.",
    mentions: "Cette attestation est remise au stagiaire conformement a l'article L.6353-1 du Code du travail.\n\n{{entreprise.nomEntreprise}} — SIRET {{entreprise.siret}} — NDA {{entreprise.nda}}",
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_SESSION, ...VAR_COMMON],
  },
  {
    id: "doc_feuille_presence",
    type: "feuille_presence",
    nom: "Feuille de presence",
    description: "Emargement par demi-journee.",
    titre: "Feuille d'emargement",
    introduction: "Formation : {{formation.titre}} — du {{session.dateDebut}} au {{session.dateFin}}\nLieu : {{session.lieu}}",
    corps: "Les stagiaires soussignes certifient avoir suivi la formation aux dates indiquees. Les signatures attestent de la presence effective a chaque demi-journee.",
    mentions: "Document conforme aux exigences Qualiopi — indicateur 11 (tracabilite de la realisation).\n\n{{entreprise.nomEntreprise}} — NDA {{entreprise.nda}}",
    variables: [...VAR_FORMATION, ...VAR_SESSION, ...VAR_COMMON],
  },
  {
    id: "doc_devis",
    type: "devis",
    nom: "Devis",
    description: "Proposition commerciale.",
    titre: "Devis",
    introduction: "Proposition commerciale pour la mise en place d'actions de formation professionnelle continue.",
    corps: "Les lignes detaillees ci-dessous precisent les prestations proposees, leur duree et leur tarif. Les montants sont exprimes hors taxes.",
    mentions: "Devis valable 30 jours a compter de la date d'emission. Signature precedee de la mention &laquo;Bon pour accord&raquo; valant acceptation du devis et des conditions generales de vente.\n\n{{entreprise.nomEntreprise}} — SIRET {{entreprise.siret}} — NDA {{entreprise.nda}}",
    variables: [...VAR_COMMON],
  },
  {
    id: "doc_facture",
    type: "facture",
    nom: "Facture",
    description: "Facture client apres la formation.",
    titre: "Facture",
    introduction: "Facturation des actions de formation professionnelle realisees.",
    corps: "Les lignes detaillees correspondent aux prestations effectuees. Le reglement est du a l'echeance indiquee.",
    mentions: "Reglement a 30 jours a compter de la date de facturation sauf mention contraire.\nEn cas de retard, penalite de 3 fois le taux d'interet legal + indemnite forfaitaire de 40 euros pour frais de recouvrement (art. L.441-10 du Code de commerce).\nTVA non applicable, art. 261.4.4° du CGI pour les actions de formation professionnelle continue.\n\n{{entreprise.nomEntreprise}} — SIRET {{entreprise.siret}} — NDA {{entreprise.nda}}",
    variables: [...VAR_COMMON],
  },
];

// Charge un template depuis la base (ou fallback sur le defaut code)
export async function loadDocumentTemplate(type: string): Promise<{
  titre: string;
  introduction: string;
  corps: string;
  mentions: string;
} | null> {
  try {
    const tpl = await prisma.documentTemplate.findUnique({ where: { type } });
    if (tpl && tpl.actif) {
      return {
        titre: tpl.titre,
        introduction: tpl.introduction || "",
        corps: tpl.corps,
        mentions: tpl.mentions || "",
      };
    }
  } catch { /* fall through */ }
  const def = DOCUMENT_TEMPLATE_DEFAULTS.find((d) => d.type === type);
  if (def) return { titre: def.titre, introduction: def.introduction, corps: def.corps, mentions: def.mentions };
  return null;
}

// Rend un template avec des variables (renvoi des strings prets a placer dans un PDF)
export async function renderDocumentTemplate(type: string, vars: Record<string, unknown>): Promise<{
  titre: string;
  introduction: string;
  corps: string;
  mentions: string;
} | null> {
  const tpl = await loadDocumentTemplate(type);
  if (!tpl) return null;
  return {
    titre: applyVariables(tpl.titre, vars),
    introduction: applyVariables(tpl.introduction, vars),
    corps: applyVariables(tpl.corps, vars),
    mentions: applyVariables(tpl.mentions, vars),
  };
}
