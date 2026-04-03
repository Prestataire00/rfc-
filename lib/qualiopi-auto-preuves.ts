export type PreuveAuto = {
  titre: string;
  description: string;
  lien: string;
  disponible: boolean;
  count?: number;
};

export type AutoPreuvesStats = {
  nbFormations: number;
  nbSessions: number;
  nbInscriptions: number;
  nbPresences: number;
  nbEvaluations: number;
  noteMoyenne: number;
  nbFeedbacks: number;
  nbContacts: number;
  nbAttestations: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AUTO_PREUVES: Record<number, (s: AutoPreuvesStats) => PreuveAuto> = {
  1: (s) => ({
    titre: "Catalogue formations",
    description: `${s.nbFormations} formation${s.nbFormations > 1 ? "s" : ""} active${s.nbFormations > 1 ? "s" : ""} publiée${s.nbFormations > 1 ? "s" : ""} dans le CRM`,
    lien: "/formations",
    disponible: s.nbFormations > 0,
    count: s.nbFormations,
  }),
  2: (s) => ({
    titre: "Objectifs de formation renseignés",
    description: `${s.nbFormations} formation${s.nbFormations > 1 ? "s" : ""} avec objectifs et prérequis documentés`,
    lien: "/formations",
    disponible: s.nbFormations > 0,
    count: s.nbFormations,
  }),
  3: (s) => ({
    titre: "Inscriptions stagiaires tracées",
    description: `${s.nbInscriptions} inscription${s.nbInscriptions > 1 ? "s" : ""} enregistrée${s.nbInscriptions > 1 ? "s" : ""} avec statut de suivi`,
    lien: "/contacts",
    disponible: s.nbInscriptions > 0,
    count: s.nbInscriptions,
  }),
  9: (s) => ({
    titre: "Sessions planifiées",
    description: `${s.nbSessions} session${s.nbSessions > 1 ? "s" : ""} de formation planifiée${s.nbSessions > 1 ? "s" : ""} et suivies`,
    lien: "/sessions",
    disponible: s.nbSessions > 0,
    count: s.nbSessions,
  }),
  11: (s) => ({
    titre: "Feuilles de présence numériques",
    description: `${s.nbPresences} feuille${s.nbPresences > 1 ? "s" : ""} d'émargement renseignée${s.nbPresences > 1 ? "s" : ""} dans le CRM`,
    lien: "/sessions",
    disponible: s.nbPresences > 0,
    count: s.nbPresences,
  }),
  17: (s) => ({
    titre: "Stagiaires identifiés",
    description: `${s.nbContacts} contact${s.nbContacts > 1 ? "s" : ""} stagiaire${s.nbContacts > 1 ? "s" : ""} enregistré${s.nbContacts > 1 ? "s" : ""} dans le CRM`,
    lien: "/contacts",
    disponible: s.nbContacts > 0,
    count: s.nbContacts,
  }),
  20: (s) => ({
    titre: "Attestations de fin de formation",
    description: `${s.nbAttestations} attestation${s.nbAttestations > 1 ? "s" : ""} générée${s.nbAttestations > 1 ? "s" : ""} et archivée${s.nbAttestations > 1 ? "s" : ""}`,
    lien: "/sessions",
    disponible: s.nbAttestations > 0,
    count: s.nbAttestations,
  }),
  30: (s) => ({
    titre: "Évaluations satisfaction collectées",
    description: s.nbEvaluations > 0
      ? `${s.nbEvaluations} évaluation${s.nbEvaluations > 1 ? "s" : ""} collectée${s.nbEvaluations > 1 ? "s" : ""} — note moyenne ${s.noteMoyenne}/5`
      : "Aucune évaluation collectée",
    lien: "/evaluations",
    disponible: s.nbEvaluations > 0,
    count: s.nbEvaluations,
  }),
  31: (s) => ({
    titre: "Feedbacks formateurs recueillis",
    description: `${s.nbFeedbacks} feedback${s.nbFeedbacks > 1 ? "s" : ""} formateur${s.nbFeedbacks > 1 ? "s" : ""} enregistré${s.nbFeedbacks > 1 ? "s" : ""}`,
    lien: "/evaluations",
    disponible: s.nbFeedbacks > 0,
    count: s.nbFeedbacks,
  }),
  32: (s) => ({
    titre: "Suivi des actions d'amélioration",
    description: s.nbFeedbacks > 0
      ? `Basé sur ${s.nbFeedbacks} feedback${s.nbFeedbacks > 1 ? "s" : ""} formateur avec suggestions documentées`
      : "Aucun feedback disponible",
    lien: "/evaluations",
    disponible: s.nbFeedbacks > 0,
    count: s.nbFeedbacks,
  }),
};
