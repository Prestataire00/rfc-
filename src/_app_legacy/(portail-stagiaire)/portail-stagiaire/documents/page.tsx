import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderOpen } from "lucide-react";

export default function StagiaireDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes documents"
        description="Attestations, convocations et documents de formation"
      />
      <EmptyState
        icon={FolderOpen}
        title="Aucun document"
        description="Vos attestations de formation et documents apparaîtront ici."
      />
    </div>
  );
}
