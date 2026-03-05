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
import { GraduationCap } from "lucide-react";

export default async function FormateurSessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const sessions = await db.sessionFormation.findMany({
    where: { formateurId: session.user.id },
    include: {
      formation: { select: { title: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes sessions"
        description={`${sessions.length} session(s) assignée(s)`}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune session"
          description="Vous n'avez pas encore de session assignée."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formation</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-center">Inscrits</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.formation.title}
                  </TableCell>
                  <TableCell>
                    {new Date(s.startDate).toLocaleDateString("fr-FR")}
                    {" - "}
                    {new Date(s.endDate).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-center">
                    {s._count.enrollments}/{s.maxParticipants}
                  </TableCell>
                  <TableCell>
                    <SessionStatusBadge status={s.status} />
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
