/**
 * Calcul des KPI ROI pour l'espace client.
 *
 * Pure fonctions, sans I/O. La route API charge les rows depuis Prisma puis
 * appelle aggregateRoi() — testable sans DB.
 *
 * Convention : "stagiaires formés" = contacts uniques avec au moins une
 * inscription en statut "presente" (et non juste "confirmee" — la présence
 * effective est ce qui compte pour le ROI Qualiopi).
 */

export type InscriptionRow = {
  contactId: string;
  statut: string;
  session: {
    formationId: string;
    dateDebut: Date;
    formation: { duree: number };
  };
};

export type EvaluationRow = {
  noteGlobale: number | null;
  estComplete: boolean;
  type: string;
  cible: string;
};

export type FactureRow = {
  montantTTC: number;
  statut: string;
};

export type RoiKpis = {
  nbStagiairesFormes: number;
  nbInscriptionsTotal: number;
  nbInscriptionsPresentes: number;
  nbFormationsDistinctes: number;
  heuresTotalesFormation: number;
  tauxAssiduite: number; // 0..1 — null possible si denominateur = 0
  noteSatisfactionMoyenne: number | null; // 1..5
  nbEvaluationsCompletes: number;
  investissementTotalTTC: number;
};

export type RoiInput = {
  inscriptions: ReadonlyArray<InscriptionRow>;
  evaluations: ReadonlyArray<EvaluationRow>;
  factures: ReadonlyArray<FactureRow>;
  /** Limite temporelle (utile pour ROI "année en cours"). */
  since?: Date;
};

export function aggregateRoi(input: RoiInput): RoiKpis {
  const inscriptions = input.since
    ? input.inscriptions.filter(
        (i) => i.session.dateDebut.getTime() >= input.since!.getTime(),
      )
    : input.inscriptions;

  const presentes = inscriptions.filter((i) => i.statut === "presente");

  const stagiairesPresents = new Set(presentes.map((i) => i.contactId));
  const formationsDistinctes = new Set(
    presentes.map((i) => i.session.formationId),
  );

  const heures = presentes.reduce((acc, i) => acc + i.session.formation.duree, 0);

  // Assiduité = présents / (présents + absents). Les "annulee" et "en_attente"
  // ne comptent pas dans le dénominateur — l'assiduité mesure ceux qui se sont
  // engagés à venir.
  const considereesPourAssiduite = inscriptions.filter((i) =>
    ["presente", "absente"].includes(i.statut),
  );
  const tauxAssiduite =
    considereesPourAssiduite.length === 0
      ? 0
      : presentes.length / considereesPourAssiduite.length;

  // Satisfaction : moyenne des évaluations stagiaire "à chaud" complétées.
  // On exclut les évaluations client/formateur — c'est la satisfaction du
  // stagiaire qui est l'indicateur ROI pertinent.
  const satisfactionsStagiaire = input.evaluations.filter(
    (e) =>
      e.estComplete &&
      e.cible === "stagiaire" &&
      e.type === "satisfaction_chaud" &&
      typeof e.noteGlobale === "number",
  );
  const noteSatisfactionMoyenne =
    satisfactionsStagiaire.length === 0
      ? null
      : satisfactionsStagiaire.reduce(
          (acc, e) => acc + (e.noteGlobale ?? 0),
          0,
        ) / satisfactionsStagiaire.length;

  // Investissement réel = factures payées uniquement. Les "envoyee" /
  // "en_retard" ne sont pas du ROI tant qu'elles ne sont pas encaissées.
  const investissementTotalTTC = input.factures
    .filter((f) => f.statut === "payee")
    .reduce((acc, f) => acc + f.montantTTC, 0);

  return {
    nbStagiairesFormes: stagiairesPresents.size,
    nbInscriptionsTotal: inscriptions.length,
    nbInscriptionsPresentes: presentes.length,
    nbFormationsDistinctes: formationsDistinctes.size,
    heuresTotalesFormation: heures,
    tauxAssiduite,
    noteSatisfactionMoyenne,
    nbEvaluationsCompletes: satisfactionsStagiaire.length,
    investissementTotalTTC,
  };
}

/**
 * Coût moyen par stagiaire formé. Null si pas encore de présence enregistrée.
 */
export function coutParStagiaire(kpis: RoiKpis): number | null {
  if (kpis.nbStagiairesFormes === 0) return null;
  return kpis.investissementTotalTTC / kpis.nbStagiairesFormes;
}

/**
 * Coût horaire de la formation. Null si aucune heure dispensée.
 */
export function coutHoraire(kpis: RoiKpis): number | null {
  if (kpis.heuresTotalesFormation === 0) return null;
  return kpis.investissementTotalTTC / kpis.heuresTotalesFormation;
}
