import { PageHeader } from "@/components/shared/page-header";
import { FormationForm } from "@/components/formations/formation-form";
import { createFormation } from "../actions";

export default function NewFormationPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nouvelle formation" />
      <FormationForm action={createFormation} />
    </div>
  );
}
