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
import { Building2 } from "lucide-react";

export default async function ClientsPage() {
  const organizations = await db.organization.findMany({
    include: {
      _count: { select: { users: true, enrollments: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description={`${organizations.length} organisation(s)`}
      />

      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun client"
          description="Les organisations clientes apparaîtront ici."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>SIRET</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-center">Utilisateurs</TableHead>
                <TableHead className="text-center">Inscriptions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.siret ?? "—"}</TableCell>
                  <TableCell>{org.email ?? "—"}</TableCell>
                  <TableCell>{org.phone ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{org._count.users}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{org._count.enrollments}</Badge>
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
