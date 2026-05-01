import {
  CONTACT_TYPES, INSCRIPTION_STATUTS, SESSION_STATUTS, DEVIS_STATUTS,
  BESOIN_STATUTS, BESOIN_PRIORITES, EVALUATION_TYPES,
} from "@/lib/constants";

export interface Session {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: keyof typeof SESSION_STATUTS;
  lieu: string | null;
  formation: { id: string; titre: string };
}

export interface Inscription {
  id: string;
  statut: keyof typeof INSCRIPTION_STATUTS;
  createdAt: string;
  session: Session;
}

export interface Devis {
  id: string;
  numero: string;
  objet: string;
  montantHT: number;
  montantTTC: number;
  statut: keyof typeof DEVIS_STATUTS;
  dateEmission: string;
  dateValidite: string;
}

export interface Attestation {
  id: string;
  type: string;
  statut: string;
  createdAt: string;
  session: { id: string; formation: { titre: string } };
}

export interface EvaluationData {
  id: string;
  type: keyof typeof EVALUATION_TYPES;
  noteGlobale: number | null;
  estComplete: boolean;
  commentaire: string | null;
  createdAt: string;
  session: { id: string; formation: { titre: string } };
}

export interface Besoin {
  id: string;
  titre: string;
  statut: keyof typeof BESOIN_STATUTS;
  priorite: keyof typeof BESOIN_PRIORITES;
  nbStagiaires: number | null;
  createdAt: string;
  formation: { id: string; titre: string } | null;
}

export interface FeuillePresence {
  id: string;
  date: string;
  matin: boolean;
  apresMidi: boolean;
  session: { id: string; formation: { titre: string } };
}

export interface Entreprise {
  id: string;
  nom: string;
}

export interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  type: keyof typeof CONTACT_TYPES;
  poste: string | null;
  notes: string | null;
  entreprise: Entreprise | null;
  inscriptions: Inscription[];
  devis: Devis[];
  attestations: Attestation[];
  evaluations: EvaluationData[];
  besoins: Besoin[];
  feuillesPresence: FeuillePresence[];
  createdAt: string;
}

export type TabKey = "informations" | "formations" | "documents" | "devis" | "evaluations" | "besoins";
