import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderOpen } from "lucide-react";

export default function ClientDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bibliothèque documentaire"
        description="Conventions, factures, attestations, feuilles de présence"
      />
      <EmptyState
        icon={FolderOpen}
        title="Aucun document"
        description="Les documents administratifs liés à vos formations apparaîtront ici."
      />
    </div>
  );
}
