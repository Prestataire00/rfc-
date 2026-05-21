export type TabKey = "infos" | "contacts" | "besoins" | "devis" | "factures" | "historique";

export interface EntrepriseContact {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  poste: string | null;
  type: string;
}

export interface EntrepriseDevis {
  id: string;
  numero: string;
  objet: string;
  montantTTC: number;
  statut: string;
  dateEmission: string;
}

export interface EntrepriseFacture {
  id: string;
  numero: string;
  montantTTC: number;
  statut: string;
  dateEmission: string;
  dateEcheance: string;
}

export interface EntrepriseDemande {
  id: string;
  titre: string;
  statut: string;
  priorite: string;
  createdAt: string;
  nbStagiaires: number | null;
  devisId: string | null;
}

export interface HistoriqueAction {
  id: string;
  action: string;
  label: string;
  detail: string | null;
  lien: string | null;
  createdAt: string;
}

export interface Entreprise {
  id: string;
  createdAt: string;
  nom: string;
  secteur: string | null;
  adresse: string | null;
  ville: string | null;
  codePostal: string | null;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  site: string | null;
  notes: string | null;
  effectif: number | null;
  typeEntreprise: string | null;
  contacts: EntrepriseContact[];
  devis: EntrepriseDevis[];
  factures: EntrepriseFacture[];
  demandes: EntrepriseDemande[];
}
