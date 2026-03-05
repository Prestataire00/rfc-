import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import { DeleteFormationButton } from "@/components/formations/delete-formation-button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Euro, Pencil, Plus } from "lucide-react";

interface Props {
  params: Promise<{ formationId: string }>;
}

export default async function FormationDetailPage({ params }: Props) {
  const { formationId } = await params;

  const formation = await db.formation.findUnique({
    where: { id: formationId },
    include: {
      sessions: {
        include: {
          formateur: { select: { id: true, name: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!formation) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={formation.title}>
        <DeleteFormationButton formationId={formation.id} />
        <Button variant="outline" asChild>
          <Link href={`/formations/${formation.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/formations/${formation.id}/sessions/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle session
          </Link>
        </Button>
      </PageHeader>

      {/* Formation info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formation.durationHours}h</p>
              <p className="text-xs text-muted-foreground">Durée</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Euro className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {Number(formation.price).toLocaleString("fr-FR")} &euro;
              </p>
              <p className="text-xs text-muted-foreground">Prix</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formation.sessions.length}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-2">
            <FormationCategoryBadge category={formation.category} />
            <Badge variant={formation.isActive ? "default" : "secondary"}>
              {formation.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {(formation.description || formation.objectives) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formation.description && (
              <p className="text-sm whitespace-pre-line">{formation.description}</p>
            )}
            {formation.objectives && (
              <div>
                <h4 className="text-sm font-medium mb-1">Objectifs</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {formation.objectives}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {formation.sessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Aucune session"
              description="Créez une première session pour cette formation."
            >
              <Button asChild size="sm">
                <Link href={`/formations/${formation.id}/sessions/new`}>
                  Créer une session
                </Link>
              </Button>
            </EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dates</TableHead>
                  <TableHead>Modalité</TableHead>
                  <TableHead>Lieu</TableHead>
                  <TableHead>Formateur</TableHead>
                  <TableHead className="text-center">Inscrits</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formation.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Link
                        href={`/formations/${formation.id}/sessions/${session.id}`}
                        className="font-medium hover:underline"
                      >
                        {new Date(session.startDate).toLocaleDateString("fr-FR")}
                        {" - "}
                        {new Date(session.endDate).toLocaleDateString("fr-FR")}
                      </Link>
                    </TableCell>
                    <TableCell>{session.modality}</TableCell>
                    <TableCell>{session.location ?? "—"}</TableCell>
                    <TableCell>{session.formateur?.name ?? "Non assigné"}</TableCell>
                    <TableCell className="text-center">
                      {session._count.enrollments}/{session.maxParticipants}
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
