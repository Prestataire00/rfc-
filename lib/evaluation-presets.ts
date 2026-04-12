// Templates d'evaluation preconstruits (Qualiopi-ready).
// Ces templates sont upserts a la demande via /api/evaluation-templates/seed.
// Ils sont marques `preset=true` et proteges en ecriture cote API.

export type PresetQuestion =
  | {
      id: string;
      type: "note" | "texte" | "oui_non" | "choix" | "echelle";
      label: string;
      required: boolean;
      options?: string[];
      echelleMin?: number;
      echelleMax?: number;
      echelleLabelMin?: string;
      echelleLabelMax?: string;
    }
  | {
      type: "section";
      id: string;
      label: string;
    };

export type PresetTemplate = {
  id: string;
  nom: string;
  description: string;
  type: "satisfaction_chaud" | "satisfaction_froid" | "acquis" | "custom";
  icon: string;
  ordre: number;
  questions: PresetQuestion[];
};

export const EVALUATION_PRESETS: PresetTemplate[] = [
  // ─────────────────────────────────────────────
  // 1. Satisfaction a chaud (Qualiopi indicateur 30)
  // ─────────────────────────────────────────────
  {
    id: "preset_satisfaction_chaud",
    nom: "Satisfaction a chaud",
    description: "Questionnaire standard a envoyer a J+1 apres la formation. Recueille l'avis des stagiaires sur le contenu, la pedagogie et l'organisation.",
    type: "satisfaction_chaud",
    icon: "ThumbsUp",
    ordre: 1,
    questions: [
      { type: "section", id: "s1", label: "Contenu et objectifs" },
      { id: "q1", type: "note", required: true, label: "Le contenu correspondait a vos attentes" },
      { id: "q2", type: "note", required: true, label: "Les objectifs pedagogiques ont ete atteints" },
      { id: "q3", type: "note", required: true, label: "Les connaissances transmises sont applicables a votre activite" },
      { type: "section", id: "s2", label: "Pedagogie et formateur" },
      { id: "q4", type: "note", required: true, label: "Les methodes pedagogiques etaient adaptees" },
      { id: "q5", type: "note", required: true, label: "Le formateur etait competent et disponible" },
      { id: "q6", type: "note", required: true, label: "Le rythme de la formation etait adapte" },
      { type: "section", id: "s3", label: "Organisation et logistique" },
      { id: "q7", type: "note", required: true, label: "L'organisation generale etait satisfaisante" },
      { id: "q8", type: "note", required: false, label: "La qualite des supports pedagogiques" },
      { type: "section", id: "s4", label: "Recommandation" },
      { id: "q9", type: "echelle", required: true, label: "Recommanderiez-vous cette formation a un collegue ?", echelleMin: 0, echelleMax: 10, echelleLabelMin: "Pas du tout", echelleLabelMax: "Tout a fait" },
      { id: "q10", type: "texte", required: false, label: "Commentaires libres et suggestions d'amelioration" },
    ],
  },

  // ─────────────────────────────────────────────
  // 2. Satisfaction a froid (Qualiopi indicateur 31)
  // ─────────────────────────────────────────────
  {
    id: "preset_satisfaction_froid",
    nom: "Satisfaction a froid (J+21)",
    description: "Questionnaire envoye 3 semaines apres la formation. Mesure la mise en pratique reelle et l'impact sur le travail.",
    type: "satisfaction_froid",
    icon: "Clock",
    ordre: 2,
    questions: [
      { type: "section", id: "s1", label: "Mise en pratique" },
      { id: "q1", type: "note", required: true, label: "Vous avez pu mettre en pratique les acquis de la formation" },
      { id: "q2", type: "note", required: true, label: "La formation a eu un impact positif sur votre travail" },
      { id: "q3", type: "note", required: true, label: "Vous estimez avoir progresse dans les competences visees" },
      { type: "section", id: "s2", label: "Appreciation generale" },
      { id: "q4", type: "echelle", required: true, label: "Recommanderiez-vous cette formation aujourd'hui ?", echelleMin: 0, echelleMax: 10, echelleLabelMin: "Pas du tout", echelleLabelMax: "Tout a fait" },
      { id: "q5", type: "oui_non", required: false, label: "Ressentez-vous le besoin d'une formation complementaire ?" },
      { id: "q6", type: "texte", required: false, label: "Si oui, sur quels sujets ?" },
      { id: "q7", type: "note", required: true, label: "Satisfaction globale, avec le recul" },
      { id: "q8", type: "texte", required: false, label: "Retour d'experience apres mise en pratique" },
    ],
  },

  // ─────────────────────────────────────────────
  // 3. Positionnement pre-formation
  // ─────────────────────────────────────────────
  {
    id: "preset_positionnement",
    nom: "Positionnement pre-formation",
    description: "Evalue le niveau initial du stagiaire et ses attentes avant le demarrage de la formation. A envoyer apres inscription.",
    type: "acquis",
    icon: "Target",
    ordre: 3,
    questions: [
      { type: "section", id: "s1", label: "Votre niveau actuel" },
      { id: "q1", type: "echelle", required: true, label: "Comment evaluez-vous votre niveau sur le sujet aujourd'hui ?", echelleMin: 0, echelleMax: 10, echelleLabelMin: "Debutant", echelleLabelMax: "Expert" },
      { id: "q2", type: "oui_non", required: true, label: "Avez-vous deja suivi une formation similaire ?" },
      { id: "q3", type: "texte", required: false, label: "Si oui, precisez (titre, date, organisme)" },
      { type: "section", id: "s2", label: "Vos attentes" },
      { id: "q4", type: "texte", required: true, label: "Quelles sont vos principales attentes pour cette formation ?" },
      { id: "q5", type: "texte", required: false, label: "Dans quel contexte professionnel comptez-vous appliquer ces competences ?" },
      { id: "q6", type: "echelle", required: true, label: "Quelle est votre motivation pour suivre cette formation ?", echelleMin: 0, echelleMax: 10, echelleLabelMin: "Faible", echelleLabelMax: "Tres forte" },
    ],
  },

  // ─────────────────────────────────────────────
  // 4. Evaluation des acquis (post-formation)
  // ─────────────────────────────────────────────
  {
    id: "preset_acquis_post",
    nom: "Evaluation des acquis",
    description: "Verifie les connaissances acquises a la fin de la formation. Combine auto-evaluation et questions de verification.",
    type: "acquis",
    icon: "GraduationCap",
    ordre: 4,
    questions: [
      { type: "section", id: "s1", label: "Auto-evaluation" },
      { id: "q1", type: "echelle", required: true, label: "Votre niveau sur le sujet en debut de formation", echelleMin: 0, echelleMax: 10, echelleLabelMin: "Debutant", echelleLabelMax: "Expert" },
      { id: "q2", type: "echelle", required: true, label: "Votre niveau sur le sujet en fin de formation", echelleMin: 0, echelleMax: 10, echelleLabelMin: "Debutant", echelleLabelMax: "Expert" },
      { id: "q3", type: "note", required: true, label: "Vous vous sentez capable d'appliquer les acquis en situation reelle" },
      { type: "section", id: "s2", label: "Verification" },
      { id: "q4", type: "oui_non", required: true, label: "Avez-vous atteint les objectifs pedagogiques annonces ?" },
      { id: "q5", type: "texte", required: true, label: "Citez 3 competences cles acquises pendant la formation" },
      { id: "q6", type: "texte", required: false, label: "Un sujet reste peu maitrise ? Lequel ?" },
      { id: "q7", type: "note", required: false, label: "Qualite de l'evaluation des acquis realisee pendant la formation" },
      { id: "q8", type: "texte", required: false, label: "Commentaires" },
    ],
  },

  // ─────────────────────────────────────────────
  // 5. Evaluation du formateur
  // ─────────────────────────────────────────────
  {
    id: "preset_evaluation_formateur",
    nom: "Evaluation du formateur",
    description: "Retour des stagiaires sur la prestation du formateur (expertise, animation, posture pedagogique).",
    type: "custom",
    icon: "UserCheck",
    ordre: 5,
    questions: [
      { id: "q1", type: "note", required: true, label: "Maitrise du sujet et expertise metier" },
      { id: "q2", type: "note", required: true, label: "Qualite de l'animation et dynamique" },
      { id: "q3", type: "note", required: true, label: "Clarte des explications" },
      { id: "q4", type: "note", required: true, label: "Ecoute et reponses aux questions" },
      { id: "q5", type: "note", required: true, label: "Gestion du temps et du rythme" },
      { id: "q6", type: "texte", required: false, label: "Points forts du formateur" },
      { id: "q7", type: "texte", required: false, label: "Axes d'amelioration" },
    ],
  },

  // ─────────────────────────────────────────────
  // 6. Questionnaire employeur / manager
  // ─────────────────────────────────────────────
  {
    id: "preset_employeur",
    nom: "Questionnaire employeur / manager",
    description: "A envoyer au responsable du salarie forme, environ 2 mois apres la formation, pour mesurer le transfert de competences et le ROI.",
    type: "custom",
    icon: "Briefcase",
    ordre: 6,
    questions: [
      { type: "section", id: "s1", label: "Transfert en situation de travail" },
      { id: "q1", type: "note", required: true, label: "Le salarie applique les competences acquises" },
      { id: "q2", type: "note", required: true, label: "Vous constatez une evolution de sa pratique professionnelle" },
      { id: "q3", type: "note", required: true, label: "La formation a repondu au besoin exprime" },
      { type: "section", id: "s2", label: "Impact business" },
      { id: "q4", type: "echelle", required: true, label: "Impact global sur la performance de votre equipe", echelleMin: 0, echelleMax: 10, echelleLabelMin: "Nul", echelleLabelMax: "Fort" },
      { id: "q5", type: "oui_non", required: true, label: "Referiez-vous d'autres collaborateurs a cette formation ?" },
      { id: "q6", type: "texte", required: false, label: "Commentaires et besoins complementaires" },
    ],
  },

  // ─────────────────────────────────────────────
  // 7. Questionnaire financeur (OPCO)
  // ─────────────────────────────────────────────
  {
    id: "preset_financeur",
    nom: "Questionnaire financeur OPCO",
    description: "Retour du financeur sur la qualite de la prestation et le respect du cahier des charges. Requis pour Qualiopi indicateur 1.",
    type: "custom",
    icon: "Landmark",
    ordre: 7,
    questions: [
      { id: "q1", type: "note", required: true, label: "Qualite de la prestation realisee" },
      { id: "q2", type: "note", required: true, label: "Respect du cahier des charges et du programme annonce" },
      { id: "q3", type: "note", required: true, label: "Adequation de la formation au besoin du beneficiaire" },
      { id: "q4", type: "note", required: true, label: "Qualite des livrables administratifs (conventions, attestations, feuilles de presence)" },
      { id: "q5", type: "texte", required: false, label: "Remarques et axes d'amelioration" },
    ],
  },
];
