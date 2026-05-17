export const CONTACT_TYPES = {
  client: { label: "Client", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
  prospect: { label: "Prospect", color: "bg-sky-500/20 text-sky-600 border-sky-500/30" },
  stagiaire: { label: "Stagiaire", color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700" },
} as const;

export const SESSION_STATUTS = {
  planifiee: { label: "Planifiée", color: "bg-slate-500/20 text-slate-500 border-slate-500/30" },
  confirmee: { label: "Confirmée", color: "bg-sky-500/20 text-sky-500 border-sky-500/30" },
  en_cours: { label: "En cours", color: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
  terminee: { label: "Terminée", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  annulee: { label: "Annulée", color: "bg-red-500/20 text-red-500 border-red-500/30" },
} as const;

export const INSCRIPTION_STATUTS = {
  en_attente: { label: "En attente", color: "bg-slate-500/20 text-slate-500" },
  confirmee: { label: "Confirmée", color: "bg-sky-500/20 text-sky-500" },
  annulee: { label: "Annulée", color: "bg-red-500/20 text-red-500" },
  presente: { label: "Présente", color: "bg-emerald-500/20 text-emerald-500" },
  absente: { label: "Absente", color: "bg-orange-500/20 text-orange-500" },
} as const;

export const DEVIS_STATUTS = {
  brouillon: { label: "Brouillon", color: "bg-slate-500/20 text-slate-500 border-slate-500/30" },
  envoye: { label: "Envoyé", color: "bg-sky-500/20 text-sky-500 border-sky-500/30" },
  signe: { label: "Signé", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  refuse: { label: "Refusé", color: "bg-red-500/20 text-red-500 border-red-500/30" },
  expire: { label: "Expiré", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
} as const;

export const FACTURE_STATUTS = {
  en_attente: { label: "En attente", color: "bg-slate-500/20 text-slate-500 border-slate-500/30" },
  envoyee: { label: "Envoyée", color: "bg-sky-500/20 text-sky-500 border-sky-500/30" },
  payee: { label: "Payée", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  en_retard: { label: "En retard", color: "bg-red-500/20 text-red-500 border-red-500/30" },
  annulee: { label: "Annulée", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
} as const;

// Pipeline commercial demande — 5 étapes ordonnées.
// Clés Prisma conservées pour compat données (accepte, refuse) ;
// labels actualisés en vocabulaire commercial (Gagné / Perdu).
// "qualifie" et "archive" restent comme clés legacy pour les anciennes
// demandes, mais ne sont plus exposées dans le pipeline visible.
// Au passage Nouveau → Devis envoyé, l'IA génère un devis brouillon ;
// l'envoi effectif au client reste une action manuelle séparée.
export const BESOIN_STATUTS = {
  nouveau: { label: "Nouveau", color: "bg-sky-500/20 text-sky-500 border-sky-500/30" },
  devis_envoye: { label: "Devis envoyé", color: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
  en_negociation: { label: "En négociation", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
  accepte: { label: "Gagné", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  refuse: { label: "Perdu", color: "bg-red-500/20 text-red-500 border-red-500/30" },
  // Legacy — demandes pré-pipeline 5 étapes. Affichables mais non sélectionnables.
  qualifie: { label: "Qualifié (legacy)", color: "bg-violet-500/20 text-violet-500 border-violet-500/30" },
  archive: { label: "Archivé (legacy)", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
} as const;

// Statuts visibles dans le pipeline (Kanban, badges, filtres).
// Exclut "qualifie" et "archive" (valeurs legacy de fallback uniquement).
export const BESOIN_STATUTS_PIPELINE = [
  "nouveau",
  "devis_envoye",
  "en_negociation",
  "accepte",
  "refuse",
] as const;

// Statuts sélectionnables manuellement dans les dropdowns.
// "devis_envoye" est exclu : il se met à jour automatiquement quand
// l'admin envoie le devis (Devis.statut → "envoye"). Les statuts "accepte"
// et "refuse" restent manuellement choisissables pour les cas offline
// (signature papier, refus téléphonique) en plus de la sync auto via
// signature électronique.
export const BESOIN_STATUTS_MANUEL = [
  "nouveau",
  "en_negociation",
  "accepte",
  "refuse",
] as const;

export const BESOIN_ORIGINES = {
  client: { label: "Client" },
  stagiaire: { label: "Stagiaire" },
  centre: { label: "Centre" },
} as const;

export const BESOIN_PRIORITES = {
  basse: { label: "Basse", color: "text-gray-500" },
  normale: { label: "Normale", color: "text-blue-500" },
  haute: { label: "Haute", color: "text-orange-500" },
  urgente: { label: "Urgente", color: "text-red-500" },
} as const;

export const EVALUATION_TYPES = {
  satisfaction_chaud: { label: "Satisfaction a chaud" },
  satisfaction_froid: { label: "Satisfaction a froid" },
  acquis: { label: "Evaluation des acquis" },
} as const;

export const FINANCEMENT_TYPES = {
  opco: { label: "OPCO" },
  entreprise: { label: "Entreprise" },
  personnel: { label: "Personnel" },
  pole_emploi: { label: "Pole Emploi" },
  cpf: { label: "CPF" },
  autre: { label: "Autre" },
} as const;

export const NIVEAUX_FORMATION = [
  { value: "tous", label: "Tous niveaux" },
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
] as const;

export const MODALITES_FORMATION = {
  presentiel: { label: "Présentiel", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  distanciel: { label: "Distanciel", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  mixte: { label: "Mixte", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
} as const;

export const STATUTS_FORMATION = {
  brouillon: { label: "Brouillon", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  publiee: { label: "Publiée", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  archivee: { label: "Archivée", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
} as const;

export const TYPES_FINANCEMENT = [
  { value: "opco", label: "OPCO" },
  { value: "cpf", label: "CPF" },
  { value: "entreprise", label: "Entreprise" },
  { value: "personnel", label: "Personnel" },
  { value: "pole_emploi", label: "France Travail" },
  { value: "fifpl", label: "FIFPL" },
  { value: "faf_pm", label: "FAF-PM" },
  { value: "autre", label: "Autre" },
] as const;

export const TVA_RATE = 20;
