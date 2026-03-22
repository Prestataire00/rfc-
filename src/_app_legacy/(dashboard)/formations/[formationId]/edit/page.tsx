import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { FormationForm } from "@/components/formations/formation-form";
import { updateFormation } from "../../actions";

interface Props {
  params: Promise<{ formationId: string }>;
}

export default async function EditFormationPage({ params }: Props) {
  const { formationId } = await params;

  const formation = await db.formation.findUnique({
    where: { id: formationId },
  });

  if (!formation) notFound();

  const updateWithId = updateFormation.bind(null, formationId);

  return (
    <div className="space-y-6">
      <PageHeader title={`Modifier : ${formation.title}`} />
      <FormationForm
        action={updateWithId}
        defaultValues={{
          ...formation,
          price: Number(formation.price),
        }}
      />
    </div>
  );
}
