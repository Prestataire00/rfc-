export type Contact = { id: string; nom: string; prenom: string; email: string };

export type Inscription = {
  id: string;
  statut: string;
  contact: Contact & { entreprise?: { id: string; nom: string } | null };
  dateInscription: string;
};

export type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  capaciteMax: number;
  statut: string;
  notes: string | null;
  coutFormateur: number | null;
  modeExpress?: boolean;
  declarationPasseportPrevention?: boolean;
  datePasseportPrevention?: string | null;
  formation: { id: string; titre: string; tarif: number; categorie?: string | null; certifiante?: boolean };
  formateur: { id: string; nom: string; prenom: string } | null;
  devis: { id: string; numero: string; objet: string; statut: string; montantTTC: number } | null;
  inscriptions: Inscription[];
};

export type BesoinClient = {
  id: string;
  statut: string;
  optionnel: boolean;
  destinataireNom: string | null;
  destinataireEmail: string | null;
  dateEnvoi: string | null;
  dateReponse: string | null;
  secteurActivite: string | null;
  aStagiairesHandicap: boolean;
  tokenAcces: string;
};

export type BesoinStagiaire = {
  id: string;
  statut: string;
  optionnel: boolean;
  dateEnvoi: string | null;
  dateReponse: string | null;
  estRQTH: boolean;
  detailsRQTH: string | null;
  tokenAcces: string;
  contact: { id: string; nom: string; prenom: string; email: string };
};
