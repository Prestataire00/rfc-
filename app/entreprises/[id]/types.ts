import { FileText, Receipt, UserPlus, Send, Clock } from "lucide-react";
import { CONTACT_TYPES, DEVIS_STATUTS, FACTURE_STATUTS } from "@/lib/constants";

export interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  type: keyof typeof CONTACT_TYPES;
  poste: string | null;
}

export interface Devis {
  id: string;
  numero: string;
  statut: keyof typeof DEVIS_STATUTS;
  montantHT: number;
  montantTTC: number;
  createdAt: string;
  sessions: { id: string }[];
  contact: { email: string } | null;
}

export interface Facture {
  id: string;
  numero: string;
  statut: keyof typeof FACTURE_STATUTS;
  montantTTC: number;
  dateEcheance: string | null;
  createdAt: string;
  devisId: string | null;
}

export interface Entreprise {
  id: string;
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
  contacts: Contact[];
  devis: Devis[];
  factures: Facture[];
  createdAt: string;
}

export interface Financement {
  id: string;
  type: string;
  montant: number;
  organisme: string | null;
  reference: string | null;
  statut: string;
  notes: string | null;
  createdAt: string;
}

export const FINANCEMENT_TYPES: Record<string, { label: string; color: string }> = {
  opco: { label: "OPCO", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cpf: { label: "CPF", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  personnel: { label: "Personnel", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  pole_emploi: { label: "Pôle Emploi", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  entreprise: { label: "Entreprise", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  autre: { label: "Autre", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

export const FINANCEMENT_STATUTS: Record<string, { label: string; color: string }> = {
  en_cours: { label: "En attente", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  accorde: { label: "Accordé", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  refuse: { label: "Refusé", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export interface HistoriqueAction {
  id: string;
  createdAt: string;
  action: string;
  label: string;
  detail: string | null;
  lien: string | null;
}

export type TabKey = "informations" | "contacts" | "devis" | "factures" | "financement" | "historique";

export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? "s" : ""}`;
}

export function actionIcon(action: string) {
  if (action.startsWith("devis")) return FileText;
  if (action.startsWith("facture")) return Receipt;
  if (action === "inscription_creee") return UserPlus;
  if (action === "convocation_envoyee") return Send;
  if (action.includes("email") || action.includes("envoye")) return Send;
  return Clock;
}

export function actionColor(action: string): string {
  if (action.startsWith("devis")) return "bg-blue-900/30 text-blue-400 border-blue-700";
  if (action.startsWith("facture")) return "bg-orange-900/30 text-orange-400 border-orange-700";
  if (action === "inscription_creee") return "bg-violet-900/30 text-violet-400 border-violet-700";
  if (action === "convocation_envoyee" || action.includes("envoye")) return "bg-green-900/30 text-green-400 border-green-700";
  return "bg-gray-700 text-gray-400 border-gray-600";
}
