// Definition des types d'automatisations et de leurs valeurs par defaut.
// Ces defauts alimentent la table `AutomationRule` via le seed.

export type AutomationType =
  | "fiche_besoin_client"
  | "fiche_besoin_stagiaire"
  | "positionnement"
  | "convocation"
  | "convention"
  | "rappel_presence"
  | "attestation"
  | "satisfaction_chaud"
  | "satisfaction_froid"
  | "facture";

export type RelativeTo = "dateDebut" | "dateFin" | "inscription" | "creation_session";

export type AutomationDefault = {
  id: string;              // identifiant unique deterministe (= type)
  type: AutomationType;
  label: string;
  description: string;
  enabled: boolean;
  relativeTo: RelativeTo;
  offsetDays: number;      // negatif = avant, positif = apres
  offsetHours: number;
  timeOfDay: string | null; // format HH:MM
  canalEmail: boolean;
  templateId: string | null;
  ordre: number;
};

export const AUTOMATION_DEFAULTS: AutomationDefault[] = [
  // ── AVANT LA SESSION ──────────────────────────────────────────────
  {
    id: "fiche_besoin_client",
    type: "fiche_besoin_client",
    label: "Fiche besoin client",
    description: "Questionnaire envoye au responsable entreprise pour adapter la formation. Declenche a la creation de la session.",
    enabled: true,
    relativeTo: "creation_session",
    offsetDays: 0,
    offsetHours: 1,
    timeOfDay: "09:00",
    canalEmail: true,
    templateId: null,
    ordre: 10,
  },
  {
    id: "fiche_besoin_stagiaire",
    type: "fiche_besoin_stagiaire",
    label: "Fiche besoin stagiaire",
    description: "Questionnaire individuel envoye a chaque stagiaire des son inscription.",
    enabled: true,
    relativeTo: "inscription",
    offsetDays: 0,
    offsetHours: 1,
    timeOfDay: null,
    canalEmail: true,
    templateId: null,
    ordre: 20,
  },
  {
    id: "positionnement",
    type: "positionnement",
    label: "Test de positionnement",
    description: "Questionnaire de positionnement envoye aux stagiaires avant la formation.",
    enabled: true,
    relativeTo: "dateDebut",
    offsetDays: -7,
    offsetHours: 0,
    timeOfDay: "10:00",
    canalEmail: true,
    templateId: "preset_positionnement",
    ordre: 30,
  },
  {
    id: "convocation",
    type: "convocation",
    label: "Convocation",
    description: "Envoi de la convocation officielle aux stagiaires avant la session.",
    enabled: true,
    relativeTo: "dateDebut",
    offsetDays: -2,
    offsetHours: 0,
    timeOfDay: "09:00",
    canalEmail: true,
    templateId: null,
    ordre: 40,
  },
  {
    id: "convention",
    type: "convention",
    label: "Convention de formation",
    description: "Convention envoyee au client des signature du devis.",
    enabled: true,
    relativeTo: "dateDebut",
    offsetDays: -7,
    offsetHours: 0,
    timeOfDay: "09:00",
    canalEmail: true,
    templateId: null,
    ordre: 50,
  },

  // ── PENDANT LA SESSION ────────────────────────────────────────────
  {
    id: "rappel_presence",
    type: "rappel_presence",
    label: "Lien feuille de presence (QR)",
    description: "Envoi du lien / QR code pour la signature de la feuille de presence le jour J.",
    enabled: true,
    relativeTo: "dateDebut",
    offsetDays: 0,
    offsetHours: -1,
    timeOfDay: null,
    canalEmail: true,
    templateId: null,
    ordre: 60,
  },

  // ── APRES LA SESSION ──────────────────────────────────────────────
  {
    id: "attestation",
    type: "attestation",
    label: "Attestation de fin de formation",
    description: "Generation et envoi automatique des attestations aux stagiaires.",
    enabled: true,
    relativeTo: "dateFin",
    offsetDays: 1,
    offsetHours: 0,
    timeOfDay: "09:00",
    canalEmail: true,
    templateId: null,
    ordre: 70,
  },
  {
    id: "satisfaction_chaud",
    type: "satisfaction_chaud",
    label: "Evaluation a chaud",
    description: "Questionnaire de satisfaction envoye le lendemain de la session.",
    enabled: true,
    relativeTo: "dateFin",
    offsetDays: 1,
    offsetHours: 0,
    timeOfDay: "10:00",
    canalEmail: true,
    templateId: "preset_satisfaction_chaud",
    ordre: 80,
  },
  {
    id: "satisfaction_froid",
    type: "satisfaction_froid",
    label: "Evaluation a froid (J+21)",
    description: "Questionnaire de satisfaction envoye 3 semaines apres la fin pour mesurer la mise en pratique.",
    enabled: true,
    relativeTo: "dateFin",
    offsetDays: 21,
    offsetHours: 0,
    timeOfDay: "10:00",
    canalEmail: true,
    templateId: "preset_satisfaction_froid",
    ordre: 90,
  },
  {
    id: "facture",
    type: "facture",
    label: "Facture",
    description: "Emission et envoi de la facture apres la fin de la formation.",
    enabled: false,
    relativeTo: "dateFin",
    offsetDays: 1,
    offsetHours: 0,
    timeOfDay: "09:00",
    canalEmail: true,
    templateId: null,
    ordre: 100,
  },
];

// Formate un offset en libelle lisible (ex: "J-2 a 09:00", "2h avant debut", "J+1 a 10:00")
export function formatOffset(
  relativeTo: string,
  offsetDays: number,
  offsetHours: number,
  timeOfDay: string | null
): string {
  const relLabel = relativeTo === "dateDebut" ? "debut"
    : relativeTo === "dateFin" ? "fin"
    : relativeTo === "inscription" ? "inscription"
    : "creation";

  if (offsetDays === 0 && offsetHours === 0) {
    const t = timeOfDay ? ` a ${timeOfDay}` : "";
    return `Le jour ${relLabel}${t}`;
  }

  if (offsetDays !== 0) {
    const absDays = Math.abs(offsetDays);
    const prefix = offsetDays < 0 ? "J-" : "J+";
    const t = timeOfDay ? ` a ${timeOfDay}` : "";
    return `${prefix}${absDays} ${relLabel}${t}`;
  }

  // Seulement des heures
  const absH = Math.abs(offsetHours);
  const dir = offsetHours < 0 ? "avant" : "apres";
  return `${absH}h ${dir} ${relLabel}`;
}

// Calcule la date effective d'execution
export function computeTriggerDate(
  rule: { relativeTo: string; offsetDays: number; offsetHours: number; timeOfDay: string | null },
  context: { dateDebut?: Date; dateFin?: Date; dateInscription?: Date; dateCreation?: Date }
): Date | null {
  let base: Date | null = null;
  if (rule.relativeTo === "dateDebut") base = context.dateDebut ?? null;
  else if (rule.relativeTo === "dateFin") base = context.dateFin ?? null;
  else if (rule.relativeTo === "inscription") base = context.dateInscription ?? null;
  else if (rule.relativeTo === "creation_session") base = context.dateCreation ?? null;
  if (!base) return null;

  const d = new Date(base);
  d.setDate(d.getDate() + rule.offsetDays);
  d.setHours(d.getHours() + rule.offsetHours);

  if (rule.timeOfDay) {
    const [hh, mm] = rule.timeOfDay.split(":").map((n) => parseInt(n, 10));
    if (!isNaN(hh) && !isNaN(mm)) {
      d.setHours(hh, mm, 0, 0);
    }
  }
  return d;
}
