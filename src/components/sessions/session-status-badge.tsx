import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PLANIFIEE: { label: "Planifiée", variant: "outline" },
  CONFIRMEE: { label: "Confirmée", variant: "default" },
  EN_COURS: { label: "En cours", variant: "secondary" },
  TERMINEE: { label: "Terminée", variant: "outline" },
  ANNULEE: { label: "Annulée", variant: "destructive" },
};

export function SessionStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
