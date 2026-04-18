// Constantes partagees pour le moteur d'automatisation V2.
// Ce fichier est importable cote client (pas de deps serveur comme nodemailer/prisma).

export type Trigger =
  | "inscription"
  | "session_start"
  | "session_end"
  | "j_minus_1"
  | "j_minus_3"
  | "j_minus_7"
  | "j_minus_14"
  | "j_minus_30"
  | "j_plus_1"
  | "j_plus_7"
  | "j_plus_21"
  | "status_change"
  | "creation_session";

export type ConditionOperator = "equals" | "in" | "not_equals";

export type Condition = {
  field: string;
  operator: ConditionOperator;
  value: string | string[];
};

export type ActionType = "send_email" | "send_sms" | "generate_document" | "create_task" | "change_status";

export type ActionConfig = {
  templateId?: string;
  documentType?: string;
  targetStatus?: string;
  taskTitle?: string;
  taskDescription?: string;
  smsContent?: string;
};

export const TRIGGER_LABELS: Record<string, string> = {
  inscription: "Inscription d'un stagiaire",
  session_start: "Debut de session",
  session_end: "Fin de session",
  j_minus_1: "J-1 avant session",
  j_minus_3: "J-3 avant session",
  j_minus_7: "J-7 avant session",
  j_minus_14: "J-14 avant session",
  j_minus_30: "J-30 avant session",
  j_plus_1: "J+1 apres session",
  j_plus_7: "J+7 apres session",
  j_plus_21: "J+21 apres session",
  status_change: "Changement de statut",
  creation_session: "Creation de session",
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  send_email: "Envoyer un email",
  send_sms: "Envoyer un SMS",
  generate_document: "Generer un document",
  create_task: "Creer une tache",
  change_status: "Changer le statut",
};

export const CONDITION_FIELDS = [
  { value: "formation.categorie", label: "Categorie de formation" },
  { value: "formation.id", label: "Formation specifique" },
  { value: "contact.type", label: "Type de contact" },
  { value: "inscription.statut", label: "Statut d'inscription" },
];
