import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, pattern = "dd/MM/yyyy") {
  return format(new Date(date), pattern, { locale: fr });
}

export function formatDatetime(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: fr });
}

export function formatRelative(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDuree(heures: number) {
  if (heures < 8) return `${heures}h`;
  const jours = Math.round(heures / 7);
  return `${jours} jour${jours > 1 ? "s" : ""}`;
}

export function parseSpecialites(specialitesJson: string): string[] {
  try {
    return JSON.parse(specialitesJson);
  } catch {
    return [];
  }
}

export function generateNumero(prefix: string, count: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(3, "0")}`;
}
