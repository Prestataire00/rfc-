// Templates de tâches instanciés automatiquement au passage en étape.
// Modif = git commit + redéploiement (volontaire — preuve & revue Qualiopi).

import type { SessionStage, ProspectStage } from "./stages";

export type StageTaskTemplate = {
  titre: string;
  description?: string;
};

export const SESSION_STAGE_TASKS: Record<SessionStage, StageTaskTemplate[]> = {
  preparation: [
    { titre: "Valider le programme avec le formateur" },
    { titre: "Confirmer le lieu ou la classe virtuelle" },
    { titre: "Préparer le kit pédagogique" },
  ],
  convocations: [
    { titre: "Envoyer les convocations aux stagiaires" },
    { titre: "Vérifier les confirmations de présence" },
  ],
  en_cours: [
    { titre: "Animer la formation (émarger en fin de journée)" },
  ],
  cloture: [
    { titre: "Récupérer toutes les feuilles d'émargement signées" },
    { titre: "Envoyer le questionnaire d'évaluation à chaud" },
    { titre: "Générer et envoyer les attestations" },
  ],
  facturation: [
    { titre: "Émettre la facture" },
    { titre: "Suivre le paiement (échéance + relances)" },
  ],
  clos: [],
  annulee: [],
};

export const PROSPECT_STAGE_TASKS: Record<ProspectStage, StageTaskTemplate[]> =
  {
    nouveau: [{ titre: "Premier appel de qualification" }],
    qualifie: [{ titre: "Rédiger et envoyer le devis" }],
    devis_envoye: [{ titre: "Programmer une relance à J+7" }],
    relance: [{ titre: "Relancer le client" }],
    signe: [
      { titre: "Convertir en Session (créer la programmation)" },
    ],
    perdu: [],
  };
