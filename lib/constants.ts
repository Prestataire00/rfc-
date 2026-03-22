export const CONTACT_TYPES = {
  client: { label: "Client", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
  prospect: { label: "Prospect", color: "bg-sky-500/20 text-sky-600 border-sky-500/30" },
  stagiaire: { label: "Stagiaire", color: "bg-violet-500/20 text-violet-600 border-violet-500/30" },
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

export const BESOIN_STATUTS = {
  nouveau: { label: "Nouveau", color: "bg-sky-500/20 text-sky-500 border-sky-500/30" },
  qualifie: { label: "Qualifié", color: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30" },
  devis_envoye: { label: "Devis envoyé", color: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
  accepte: { label: "Accepté", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  refuse: { label: "Refusé", color: "bg-red-500/20 text-red-500 border-red-500/30" },
  archive: { label: "Archivé", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
} as const;

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
  { value: "debutant", label: "Debutant" },
  { value: "intermediaire", label: "Intermediaire" },
  { value: "avance", label: "Avance" },
] as const;

export const TVA_RATE = 20;
