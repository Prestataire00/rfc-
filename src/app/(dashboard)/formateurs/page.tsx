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
import { Users } from "lucide-react";

export default async function FormateursPage() {
  const formateurs = await db.user.findMany({
    where: { role: "FORMATEUR" },
    include: {
      _count: { select: { formateurSessions: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formateurs"
        description={`${formateurs.length} formateur(s)`}
      />

      {formateurs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun formateur"
          description="Les formateurs apparaîtront ici une fois créés."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formateurs.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name ?? "—"}</TableCell>
                  <TableCell>{f.email}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{f._count.formateurSessions}</Badge>
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
