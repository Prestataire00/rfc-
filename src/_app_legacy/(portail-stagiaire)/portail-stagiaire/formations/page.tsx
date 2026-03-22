import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import { EnrollmentStatusBadge } from "@/components/enrollments/enrollment-status-badge";
import { GraduationCap } from "lucide-react";

export default async function StagiaireFormationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const enrollments = await db.enrollment.findMany({
    where: { stagiaireId: session.user.id },
    include: {
      session: {
        include: {
          formation: { select: { title: true, durationHours: true } },
          formateur: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes formations"
        description="Historique et suivi de vos formations"
      />

      {enrollments.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune formation"
          description="Vos inscriptions aux formations apparaîtront ici."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formation</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Formateur</TableHead>
                <TableHead className="text-right">Durée</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.session.formation.title}
                  </TableCell>
                  <TableCell>
                    {new Date(e.session.startDate).toLocaleDateString("fr-FR")}
                    {" - "}
                    {new Date(e.session.endDate).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>{e.session.formateur?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {e.session.formation.durationHours}h
                  </TableCell>
                  <TableCell>
                    <SessionStatusBadge status={e.session.status} />
                  </TableCell>
                  <TableCell>
                    <EnrollmentStatusBadge status={e.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
