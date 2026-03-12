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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import { SessionStatusActions } from "@/components/sessions/session-status-actions";
import { EnrollmentStatusBadge } from "@/components/enrollments/enrollment-status-badge";
import { EnrollDialog } from "@/components/enrollments/enroll-dialog";
import { EnrollmentActions } from "@/components/enrollments/enrollment-actions";
import { Pencil, Users, MapPin, User, Calendar } from "lucide-react";

interface Props {
  params: Promise<{ formationId: string; sessionId: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const { formationId, sessionId } = await params;

  const session = await db.sessionFormation.findUnique({
    where: { id: sessionId },
    include: {
      formation: { select: { id: true, title: true } },
      formateur: { select: { id: true, name: true, email: true } },
      enrollments: {
        include: {
          stagiaire: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!session) notFound();

  const modalityLabels: Record<string, string> = {
    PRESENTIEL: "Présentiel",
    DISTANCIEL: "Distanciel",
    MIXTE: "Mixte",
  };

  // Fetch available stagiaires for enrollment dialog
  const stagiaires = await db.user.findMany({
    where: {
      role: "STAGIAIRE",
      NOT: {
        stagiaireEnrollments: {
          some: { sessionId },
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const organizations = await db.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.formation.title}
        description={`Session du ${new Date(session.startDate).toLocaleDateString("fr-FR")} au ${new Date(session.endDate).toLocaleDateString("fr-FR")}`}
      >
        <SessionStatusActions
          sessionId={session.id}
          formationId={formationId}
          currentStatus={session.status}
        />
        <Button variant="outline" asChild>
          <Link href={`/formations/${formationId}/sessions/${sessionId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="enrollments">
            Inscriptions ({session.enrollments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <SessionStatusBadge status={session.status} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {modalityLabels[session.modality]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.location ?? "Lieu non précisé"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {session.formateur?.name ?? "Non assigné"}
                  </p>
                  <p className="text-xs text-muted-foreground">Formateur</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {session.enrollments.length} / {session.maxParticipants}
                  </p>
                  <p className="text-xs text-muted-foreground">Inscrits</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {session.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {session.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Inscriptions</CardTitle>
              <EnrollDialog
                sessionId={sessionId}
                formationId={formationId}
                stagiaires={stagiaires}
                organizations={organizations}
              />
            </CardHeader>
            <CardContent>
              {session.enrollments.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Aucun inscrit"
                  description="Ajoutez des stagiaires à cette session."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stagiaire</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Origine</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {session.enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">
                          {enrollment.stagiaire.name ?? "—"}
                        </TableCell>
                        <TableCell>{enrollment.stagiaire.email}</TableCell>
                        <TableCell>{enrollment.origin}</TableCell>
                        <TableCell>{enrollment.client?.name ?? "—"}</TableCell>
                        <TableCell>
                          <EnrollmentStatusBadge status={enrollment.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <EnrollmentActions
                            enrollmentId={enrollment.id}
                            sessionId={sessionId}
                            formationId={formationId}
                            currentStatus={enrollment.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
