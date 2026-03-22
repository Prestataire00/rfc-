import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Calendar } from "lucide-react";

export default function DisponibilitesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes disponibilités"
        description="Gérez vos créneaux de disponibilité et d'indisponibilité"
      />
      <EmptyState
        icon={Calendar}
        title="Calendrier de disponibilités"
        description="Le calendrier interactif pour renseigner vos créneaux sera disponible prochainement."
      />
    </div>
  );
}
