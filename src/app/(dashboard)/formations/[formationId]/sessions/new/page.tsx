import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { SessionForm } from "@/components/sessions/session-form";
import { createSession } from "../actions";

interface Props {
  params: Promise<{ formationId: string }>;
}

export default async function NewSessionPage({ params }: Props) {
  const { formationId } = await params;

  const formation = await db.formation.findUnique({
    where: { id: formationId },
    select: { id: true, title: true },
  });

  if (!formation) notFound();

  const formateurs = await db.user.findMany({
    where: { role: "FORMATEUR" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const createWithFormationId = createSession.bind(null, formationId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle session"
        description={formation.title}
      />
      <SessionForm action={createWithFormationId} formateurs={formateurs} />
    </div>
  );
}
