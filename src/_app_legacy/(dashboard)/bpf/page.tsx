import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";

export default function BpfPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bilan Pédagogique et Financier"
        description="Préparation du BPF annuel"
      />
      <EmptyState
        icon={BarChart3}
        title="Module BPF"
        description="L'agrégation automatique des données et le suivi des financements (OPCO, entreprise, personnel) seront disponibles prochainement."
      />
    </div>
  );
}
