export const CONTACT_TYPES = {
  client: { label: "Client", color: "bg-green-100 text-green-800 border-green-200" },
  prospect: { label: "Prospect", color: "bg-blue-100 text-blue-800 border-blue-200" },
  stagiaire: { label: "Stagiaire", color: "bg-purple-100 text-purple-800 border-purple-200" },
} as const;

export const SESSION_STATUTS = {
  planifiee: { label: "Planifiee", color: "bg-gray-100 text-gray-700 border-gray-200" },
  confirmee: { label: "Confirmee", color: "bg-blue-100 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  terminee: { label: "Terminee", color: "bg-green-100 text-green-700 border-green-200" },
  annulee: { label: "Annulee", color: "bg-red-100 text-red-700 border-red-200" },
} as const;

export const INSCRIPTION_STATUTS = {
  en_attente: { label: "En attente", color: "bg-gray-100 text-gray-700" },
  confirmee: { label: "Confirmee", color: "bg-blue-100 text-blue-700" },
  annulee: { label: "Annulee", color: "bg-red-100 text-red-700" },
  presente: { label: "Presente", color: "bg-green-100 text-green-700" },
  absente: { label: "Absente", color: "bg-orange-100 text-orange-700" },
} as const;

export const DEVIS_STATUTS = {
  brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700 border-gray-200" },
  envoye: { label: "Envoye", color: "bg-blue-100 text-blue-700 border-blue-200" },
  signe: { label: "Signe", color: "bg-green-100 text-green-700 border-green-200" },
  refuse: { label: "Refuse", color: "bg-red-100 text-red-700 border-red-200" },
  expire: { label: "Expire", color: "bg-orange-100 text-orange-700 border-orange-200" },
} as const;

export const FACTURE_STATUTS = {
  en_attente: { label: "En attente", color: "bg-gray-100 text-gray-700 border-gray-200" },
  envoyee: { label: "Envoyee", color: "bg-blue-100 text-blue-700 border-blue-200" },
  payee: { label: "Payee", color: "bg-green-100 text-green-700 border-green-200" },
  en_retard: { label: "En retard", color: "bg-red-100 text-red-700 border-red-200" },
  annulee: { label: "Annulee", color: "bg-gray-100 text-gray-400 border-gray-200" },
} as const;

export const BESOIN_STATUTS = {
  nouveau: { label: "Nouveau", color: "bg-blue-100 text-blue-700 border-blue-200" },
  qualifie: { label: "Qualifie", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  devis_envoye: { label: "Devis envoye", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  accepte: { label: "Accepte", color: "bg-green-100 text-green-700 border-green-200" },
  refuse: { label: "Refuse", color: "bg-red-100 text-red-700 border-red-200" },
  archive: { label: "Archive", color: "bg-gray-100 text-gray-500 border-gray-200" },
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
