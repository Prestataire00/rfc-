import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  INSCRIT: { label: "Inscrit", variant: "outline" },
  CONFIRME: { label: "Confirmé", variant: "default" },
  PRESENT: { label: "Présent", variant: "secondary" },
  ABSENT: { label: "Absent", variant: "destructive" },
  ANNULE: { label: "Annulé", variant: "destructive" },
};

export function EnrollmentStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
