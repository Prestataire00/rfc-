import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";

export default function DevisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        description="Pipeline commercial et suivi des devis"
      />
      <EmptyState
        icon={FileText}
        title="Module Devis"
        description="Le pipeline commercial Kanban (Brouillon → Envoyé → Signé → Refusé) sera disponible prochainement."
      />
    </div>
  );
}
