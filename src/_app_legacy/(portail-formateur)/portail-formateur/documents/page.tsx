import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderOpen } from "lucide-react";

export default function FormateurDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes documents"
        description="Conventions, contrats et documents contractuels"
      />
      <EmptyState
        icon={FolderOpen}
        title="Aucun document"
        description="Vos conventions de sous-traitance et documents contractuels apparaîtront ici."
      />
    </div>
  );
}
