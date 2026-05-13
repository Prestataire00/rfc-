/**
 * Calcul des KPI agrégés pour un Projet, depuis ses entités enfants.
 *
 * Pure functions, sans I/O. Les routes API chargent les rows depuis Prisma
 * puis appellent `aggregateProjet()` — testable sans DB ni mock.
 *
 * Conventions
 *   - "CA encaissé" = factures `payee` uniquement (le réalisé, pas le promis)
 *   - "CA prévisionnel" = devis `signe` non encore facturés + factures non
 *     encore payées (= ce qui devrait rentrer si tout se passe bien)
 *   - "Avancement" : ratio sessions terminées / total sessions. Si pas de
 *     session, on retombe sur le statut du projet (en_cours=50%, termine=100%)
 */

export type ProjetStatut =
  | "brouillon"
  | "en_cours"
  | "en_pause"
  | "termine"
  | "archive";

export type SessionRow = {
  statut: string; // planifiee, confirmee, en_cours, terminee, annulee
  dateDebut: Date;
  dateFin: Date;
};

export type DevisRow = {
  statut: string; // brouillon, envoye, signe, refuse, expire
  montantTTC: number;
};

export type FactureRow = {
  statut: string; // en_attente, envoyee, payee, en_retard, annulee
  montantTTC: number;
};

export type BesoinRow = {
  statut: string;
};

export type ProjetKpis = {
  // Volumes
  nbBesoins: number;
  nbDevis: number;
  nbDevisSignes: number;
  nbSessions: number;
  nbSessionsTerminees: number;
  nbSessionsAVenir: number;
  nbFactures: number;
  nbFacturesPayees: number;
  nbFacturesEnRetard: number;

  // Finance
  caEncaisse: number; // factures payées
  caPrevisionnel: number; // factures non payées + devis signés non facturés
  caDevisEnvoyes: number; // pipe commercial (devis envoyés non signés)
  budgetRestant: number | null; // budget - caEncaisse, null si pas de budget

  // Pilotage
  avancement: number; // 0..1 (sessions terminées / total)
  joursAvantFin: number | null; // null si pas de dateFinPrevue
  enRetard: boolean; // dateFinPrevue dépassée et statut != termine/archive
};

export type AggregateInput = {
  statut: string;
  budget: number | null;
  dateFinPrevue: Date | null;
  besoins: ReadonlyArray<BesoinRow>;
  devis: ReadonlyArray<DevisRow>;
  sessions: ReadonlyArray<SessionRow>;
  factures: ReadonlyArray<FactureRow>;
  now?: Date;
};

export function aggregateProjet(input: AggregateInput): ProjetKpis {
  const now = input.now ?? new Date();

  // Sessions
  const sessionsTerminees = input.sessions.filter(
    (s) => s.statut === "terminee",
  );
  const sessionsAVenir = input.sessions.filter(
    (s) =>
      ["planifiee", "confirmee"].includes(s.statut) &&
      s.dateDebut.getTime() > now.getTime(),
  );

  // Devis
  const devisSignes = input.devis.filter((d) => d.statut === "signe");
  const devisEnvoyes = input.devis.filter((d) => d.statut === "envoye");

  // Factures
  const facturesPayees = input.factures.filter((f) => f.statut === "payee");
  const facturesEnRetard = input.factures.filter((f) => f.statut === "en_retard");
  const facturesNonPayees = input.factures.filter(
    (f) => f.statut !== "payee" && f.statut !== "annulee",
  );

  // Sommes
  const caEncaisse = facturesPayees.reduce((acc, f) => acc + f.montantTTC, 0);
  const caFacturesNonPayees = facturesNonPayees.reduce(
    (acc, f) => acc + f.montantTTC,
    0,
  );
  // Devis signés non encore facturés : on additionne les devis signés et on
  // soustrait ce qui est déjà couvert par une facture (toutes factures
  // confondues sauf annulées). Approximation conservative — si un devis
  // signé est partiellement facturé, on compte le delta restant comme
  // "à facturer" via la différence devis_signe - factures_existantes.
  const totalDevisSignes = devisSignes.reduce((acc, d) => acc + d.montantTTC, 0);
  const totalFactures = input.factures
    .filter((f) => f.statut !== "annulee")
    .reduce((acc, f) => acc + f.montantTTC, 0);
  const devisSignesNonFactures = Math.max(0, totalDevisSignes - totalFactures);

  const caPrevisionnel = caFacturesNonPayees + devisSignesNonFactures;
  const caDevisEnvoyes = devisEnvoyes.reduce((acc, d) => acc + d.montantTTC, 0);

  // Budget
  const budgetRestant =
    input.budget == null ? null : input.budget - caEncaisse;

  // Avancement
  const avancement = computeAvancement(
    input.statut,
    input.sessions.length,
    sessionsTerminees.length,
  );

  // Jours avant fin
  const joursAvantFin =
    input.dateFinPrevue == null
      ? null
      : Math.ceil(
          (input.dateFinPrevue.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

  const enRetard =
    input.dateFinPrevue != null &&
    input.dateFinPrevue.getTime() < now.getTime() &&
    !["termine", "archive"].includes(input.statut);

  return {
    nbBesoins: input.besoins.length,
    nbDevis: input.devis.length,
    nbDevisSignes: devisSignes.length,
    nbSessions: input.sessions.length,
    nbSessionsTerminees: sessionsTerminees.length,
    nbSessionsAVenir: sessionsAVenir.length,
    nbFactures: input.factures.length,
    nbFacturesPayees: facturesPayees.length,
    nbFacturesEnRetard: facturesEnRetard.length,

    caEncaisse,
    caPrevisionnel,
    caDevisEnvoyes,
    budgetRestant,

    avancement,
    joursAvantFin,
    enRetard,
  };
}

/**
 * Avancement 0..1. Pure heuristique — si pas de session, on retombe sur le
 * statut du projet. Sinon ratio de sessions terminées.
 */
function computeAvancement(
  statut: string,
  nbTotal: number,
  nbTerminees: number,
): number {
  if (nbTotal > 0) {
    return nbTerminees / nbTotal;
  }
  // Fallback statut-based
  switch (statut) {
    case "brouillon":
      return 0;
    case "en_cours":
    case "en_pause":
      return 0.5;
    case "termine":
      return 1;
    case "archive":
      return 1;
    default:
      return 0;
  }
}

/**
 * Génère un code projet lisible style "PROJ-2026-001" à partir d'un compteur
 * et de l'année. La séquence est gérée côté caller (DB count + 1 ou autre).
 */
export function buildCode(year: number, sequence: number): string {
  return `PROJ-${year}-${String(sequence).padStart(3, "0")}`;
}
