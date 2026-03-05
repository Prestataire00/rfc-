import { db } from "@/lib/db";
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
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";

export default async function StagiairesPage() {
  const stagiaires = await db.user.findMany({
    where: { role: "STAGIAIRE" },
    include: {
      organization: { select: { name: true } },
      _count: { select: { stagiaireEnrollments: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stagiaires"
        description={`${stagiaires.length} stagiaire(s)`}
      />

      {stagiaires.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Aucun stagiaire"
          description="Les stagiaires apparaîtront ici une fois inscrits."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead className="text-center">Inscriptions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stagiaires.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name ?? "—"}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.organization?.name ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{s._count.stagiaireEnrollments}</Badge>
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
