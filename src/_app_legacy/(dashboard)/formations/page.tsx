import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
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
import { FormationCategoryBadge } from "@/components/formations/formation-category-badge";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus } from "lucide-react";

export default async function FormationsPage() {
  const formations = await db.formation.findMany({
    include: {
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue de formations"
        description={`${formations.length} formation(s)`}
      >
        <Button asChild>
          <Link href="/formations/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle formation
          </Link>
        </Button>
      </PageHeader>

      {formations.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune formation"
          description="Commencez par créer votre première formation."
        >
          <Button asChild>
            <Link href="/formations/new">Créer une formation</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Durée</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formations.map((formation) => (
                <TableRow key={formation.id}>
                  <TableCell>
                    <Link
                      href={`/formations/${formation.id}`}
                      className="font-medium hover:underline"
                    >
                      {formation.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <FormationCategoryBadge category={formation.category} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formation.durationHours}h
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(formation.price).toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    {formation._count.sessions}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={formation.isActive ? "default" : "secondary"}>
                      {formation.isActive ? "Active" : "Inactive"}
                    </Badge>
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
