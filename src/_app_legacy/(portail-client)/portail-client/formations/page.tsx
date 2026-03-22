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

export default async function ClientFormationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  // Get client's organization
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  const enrollments = user?.organizationId
    ? await db.enrollment.findMany({
        where: { clientId: user.organizationId },
        include: {
          stagiaire: { select: { name: true, email: true } },
          session: {
            include: {
              formation: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes formations"
        description="Suivi des formations commandées pour vos salariés"
      />

      {enrollments.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune formation"
          description="Les formations commandées pour vos salariés apparaîtront ici."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formation</TableHead>
                <TableHead>Stagiaire</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Inscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.session.formation.title}
                  </TableCell>
                  <TableCell>{e.stagiaire.name ?? e.stagiaire.email}</TableCell>
                  <TableCell>
                    {new Date(e.session.startDate).toLocaleDateString("fr-FR")}
                    {" - "}
                    {new Date(e.session.endDate).toLocaleDateString("fr-FR")}
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
