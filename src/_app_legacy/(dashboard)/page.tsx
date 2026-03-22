import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import { GraduationCap, Users, Calendar, BarChart3 } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    activeSessionsCount,
    totalEnrollments,
    totalFormations,
    todaySessions,
    weekSessions,
  ] = await Promise.all([
    db.sessionFormation.count({
      where: { status: { in: ["CONFIRMEE", "EN_COURS"] } },
    }),
    db.enrollment.count({
      where: { status: { in: ["INSCRIT", "CONFIRME"] } },
    }),
    db.formation.count({ where: { isActive: true } }),
    db.sessionFormation.findMany({
      where: {
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        status: { not: "ANNULEE" },
      },
      include: {
        formation: { select: { title: true } },
        formateur: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    db.sessionFormation.findMany({
      where: {
        startDate: { lte: endOfWeek },
        endDate: { gte: startOfWeek },
        status: { not: "ANNULEE" },
      },
      include: {
        formation: { select: { title: true } },
        formateur: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Sessions actives
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessionsCount}</div>
            <p className="text-xs text-muted-foreground">Confirmées ou en cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inscrits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">Inscriptions actives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Formations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFormations}</div>
            <p className="text-xs text-muted-foreground">Au catalogue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Chiffre d&apos;affaires
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-- &euro;</div>
            <p className="text-xs text-muted-foreground">Module devis à venir</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Planning du jour</CardTitle>
          </CardHeader>
          <CardContent>
            {todaySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune formation aujourd&apos;hui.
              </p>
            ) : (
              <div className="space-y-3">
                {todaySessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{s.formation.title}</p>
                      <p className="text-muted-foreground">
                        {s.formateur?.name ?? "Non assigné"}
                      </p>
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planning de la semaine</CardTitle>
          </CardHeader>
          <CardContent>
            {weekSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune formation cette semaine.
              </p>
            ) : (
              <div className="space-y-3">
                {weekSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/formations/${s.formationId}/sessions/${s.id}`}
                    className="flex items-center justify-between text-sm hover:bg-accent rounded p-2 -mx-2"
                  >
                    <div>
                      <p className="font-medium">{s.formation.title}</p>
                      <p className="text-muted-foreground">
                        {new Date(s.startDate).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        {" - "}
                        {s.formateur?.name ?? "Non assigné"}
                        {" · "}
                        {s._count.enrollments} inscrit(s)
                      </p>
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
