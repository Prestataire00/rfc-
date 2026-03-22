import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { SessionForm } from "@/components/sessions/session-form";
import { updateSession } from "../../actions";

interface Props {
  params: Promise<{ formationId: string; sessionId: string }>;
}

export default async function EditSessionPage({ params }: Props) {
  const { formationId, sessionId } = await params;

  const session = await db.sessionFormation.findUnique({
    where: { id: sessionId },
    include: { formation: { select: { title: true } } },
  });

  if (!session) notFound();

  const formateurs = await db.user.findMany({
    where: { role: "FORMATEUR" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const updateWithIds = updateSession.bind(null, sessionId, formationId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier la session"
        description={session.formation.title}
      />
      <SessionForm
        action={updateWithIds}
        formateurs={formateurs}
        defaultValues={{
          ...session,
          trainerCost: session.trainerCost ? Number(session.trainerCost) : null,
        }}
      />
    </div>
  );
}
