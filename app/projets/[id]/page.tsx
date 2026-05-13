"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Calendar,
  Users as UsersIcon,
  FileText,
  Euro,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ListChecks,
  CalendarDays,
  FolderOpen,
  Banknote,
  PauseCircle,
  Archive,
  PlayCircle,
} from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";

type Kpis = {
  nbBesoins: number;
  nbDevis: number;
  nbDevisSignes: number;
  nbSessions: number;
  nbSessionsTerminees: number;
  nbSessionsAVenir: number;
  nbFactures: number;
  nbFacturesPayees: number;
  nbFacturesEnRetard: number;
  caEncaisse: number;
  caPrevisionnel: number;
  caDevisEnvoyes: number;
  budgetRestant: number | null;
  avancement: number;
  joursAvantFin: number | null;
  enRetard: boolean;
};

type ProjetDetail = {
  id: string;
  nom: string;
  code: string | null;
  description: string | null;
  statut: string;
  priorite: string;
  dateDebut: string | null;
  dateFinPrevue: string | null;
  dateFinReelle: string | null;
  chefProjet: string | null;
  budget: number | null;
  objectifs: string | null;
  livrables: string | null;
  createdAt: string;
  updatedAt: string;
  entreprise: {
    id: string;
    nom: string;
    ville: string | null;
    email: string | null;
    telephone: string | null;
  } | null;
  formateurs: Array<{
    id: string;
    role: string | null;
    formateur: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
      tarifJournalier: number | null;
    };
  }>;
  besoins: Array<{
    id: string;
    titre: string;
    statut: string;
    priorite: string;
    nbStagiaires: number | null;
    createdAt: string;
  }>;
  devis: Array<{
    id: string;
    numero: string;
    objet: string;
    montantTTC: number;
    statut: string;
    dateEmission: string;
    dateSigne: string | null;
  }>;
  sessions: Array<{
    id: string;
    dateDebut: string;
    dateFin: string;
    statut: string;
    lieu: string | null;
    formation: { titre: string; duree: number };
    formateur: { id: string; nom: string; prenom: string } | null;
    _count: { inscriptions: number };
  }>;
  factures: Array<{
    id: string;
    numero: string;
    montantTTC: number;
    statut: string;
    dateEmission: string;
    dateEcheance: string;
    datePaiement: string | null;
  }>;
  kpis: Kpis;
};

const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: Activity },
  { id: "sessions", label: "Sessions", icon: CalendarDays },
  { id: "taches", label: "Tâches", icon: ListChecks },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "finance", label: "Finance", icon: Banknote },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUT_COLOR: Record<string, string> = {
  brouillon: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  en_cours: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  en_pause: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  termine: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  archive: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
};

function fmtEur(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

export default function ProjetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");

  const { data: projet, isLoading, error, mutate } = useApi<ProjetDetail>(
    `/api/projets/${params.id}`,
  );

  async function changeStatut(statut: string) {
    if (!projet) return;
    try {
      await api.put(`/api/projets/${projet.id}`, { statut });
      notify.success(`Statut → ${statut}`);
      mutate();
    } catch (err) {
      notify.error("Impossible de changer le statut");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-red-500">Erreur : {error.message}</div>
    );
  }
  if (!projet) return null;

  const statutColor = STATUT_COLOR[projet.statut] ?? STATUT_COLOR.brouillon;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {projet.code ?? "—"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Briefcase className="h-6 w-6" /> {projet.nom}
          </h1>
          <span className={`rounded-full px-2.5 py-1 text-xs ${statutColor}`}>
            {projet.statut}
          </span>
          {projet.kpis.enRetard ? (
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" /> En retard
            </span>
          ) : null}
        </div>
        {projet.description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {projet.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {projet.statut !== "en_cours" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeStatut("en_cours")}
          >
            <PlayCircle className="mr-1 h-4 w-4" /> Démarrer
          </Button>
        ) : null}
        {projet.statut === "en_cours" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeStatut("en_pause")}
          >
            <PauseCircle className="mr-1 h-4 w-4" /> Mettre en pause
          </Button>
        ) : null}
        {!["termine", "archive"].includes(projet.statut) ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeStatut("termine")}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Terminer
          </Button>
        ) : null}
        {projet.statut !== "archive" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeStatut("archive")}
          >
            <Archive className="mr-1 h-4 w-4" /> Archiver
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projets/${projet.id}/editer`)}
        >
          Modifier
        </Button>
      </div>

      <nav className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                active
                  ? "border-red-600 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "overview" ? <OverviewTab projet={projet} /> : null}
      {tab === "sessions" ? <SessionsTab projet={projet} /> : null}
      {tab === "taches" ? <TachesTab projetId={projet.id} /> : null}
      {tab === "documents" ? <DocumentsTab projet={projet} /> : null}
      {tab === "finance" ? <FinanceTab projet={projet} /> : null}
    </div>
  );
}

type TachesStats = {
  totalLists: number;
  totalItems: number;
  completedItems: number;
  percent: number;
};

function TachesTab({ projetId }: { projetId: string }) {
  const { data, isLoading, error } = useApi<{
    lists: Array<{
      id: string;
      nom: string;
      couleur: string;
      stats: { total: number; completed: number; percent: number };
    }>;
    stats: TachesStats;
  }>(`/api/projets/${projetId}/taches`);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return (
      <Panel title="Tâches">
        <p className="text-sm text-red-500">Erreur de chargement : {error.message}</p>
      </Panel>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Panel title="Avancement global">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold">{data.stats.percent}%</div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">
              {data.stats.completedItems} / {data.stats.totalItems} tâches terminées
              · {data.stats.totalLists} liste{data.stats.totalLists > 1 ? "s" : ""}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${data.stats.percent}%` }}
              />
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Listes de tâches">
        {data.lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune liste de tâches sur ce projet pour l'instant.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.lists.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: l.couleur }}
                  />
                  <span className="font-medium truncate">{l.nom}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                  <span>
                    {l.stats.completed}/{l.stats.total}
                  </span>
                  <span className="font-medium">{l.stats.percent}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 pt-3 border-t border-border">
          <Link
            href={`/projets/${projetId}/taches`}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline"
          >
            Voir / gérer les tâches en détail →
          </Link>
        </div>
      </Panel>
    </div>
  );
}

function OverviewTab({ projet }: { projet: ProjetDetail }) {
  const { kpis } = projet;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={Activity}
          label="Avancement"
          value={`${Math.round(kpis.avancement * 100)} %`}
          hint={`${kpis.nbSessionsTerminees}/${kpis.nbSessions} sessions terminées`}
        />
        <Kpi
          icon={CalendarDays}
          label="Sessions à venir"
          value={String(kpis.nbSessionsAVenir)}
          hint={`${kpis.nbSessions} sessions au total`}
        />
        <Kpi
          icon={Euro}
          label="CA encaissé"
          value={fmtEur(kpis.caEncaisse)}
          hint={`${kpis.nbFacturesPayees}/${kpis.nbFactures} factures payées`}
          tone={kpis.nbFacturesEnRetard > 0 ? "warn" : undefined}
        />
        <Kpi
          icon={Calendar}
          label="Jours avant fin"
          value={kpis.joursAvantFin == null ? "—" : `${kpis.joursAvantFin} j`}
          hint={fmtDate(projet.dateFinPrevue)}
          tone={kpis.enRetard ? "bad" : undefined}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Client & pilotage">
          <Row
            icon={Building2}
            label="Entreprise"
            value={
              projet.entreprise ? (
                <Link
                  href={`/entreprises/${projet.entreprise.id}`}
                  className="underline"
                >
                  {projet.entreprise.nom}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Row icon={UsersIcon} label="Chef de projet" value={projet.chefProjet ?? "—"} />
          <Row icon={Calendar} label="Date de début" value={fmtDate(projet.dateDebut)} />
          <Row icon={Calendar} label="Date de fin prévue" value={fmtDate(projet.dateFinPrevue)} />
          <Row icon={Calendar} label="Date de fin réelle" value={fmtDate(projet.dateFinReelle)} />
          <Row
            icon={Euro}
            label="Budget"
            value={fmtEur(projet.budget)}
            hint={
              kpis.budgetRestant != null
                ? `Reste : ${fmtEur(kpis.budgetRestant)}`
                : undefined
            }
          />
        </Panel>

        <Panel title={`Équipe formateurs (${projet.formateurs.length})`}>
          {projet.formateurs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun formateur assigné. Modifier le projet pour en ajouter.
            </p>
          ) : (
            <ul className="space-y-2">
              {projet.formateurs.map((pf) => (
                <li
                  key={pf.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {pf.formateur.prenom} {pf.formateur.nom}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pf.formateur.email}
                      {pf.role ? ` · ${pf.role}` : ""}
                    </p>
                  </div>
                  {pf.formateur.tarifJournalier ? (
                    <span className="text-xs text-muted-foreground">
                      {fmtEur(pf.formateur.tarifJournalier)}/j
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {projet.objectifs || projet.livrables ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projet.objectifs ? (
            <Panel title="Objectifs">
              <p className="whitespace-pre-wrap text-sm">{projet.objectifs}</p>
            </Panel>
          ) : null}
          {projet.livrables ? (
            <Panel title="Livrables">
              <p className="whitespace-pre-wrap text-sm">{projet.livrables}</p>
            </Panel>
          ) : null}
        </section>
      ) : null}

      {projet.besoins.length > 0 ? (
        <Panel title={`Besoins (${projet.besoins.length})`}>
          <ul className="divide-y divide-border">
            {projet.besoins.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <Link
                  href={`/besoins/${b.id}`}
                  className="font-medium hover:underline"
                >
                  {b.titre}
                </Link>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{b.statut}</span>
                  <span>·</span>
                  <span>
                    {b.nbStagiaires ? `${b.nbStagiaires} stagiaires` : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function SessionsTab({ projet }: { projet: ProjetDetail }) {
  const newSessionHref = `/sessions/nouveau?projetId=${projet.id}`;

  if (projet.sessions.length === 0) {
    return (
      <Panel title="Sessions">
        <p className="text-sm text-muted-foreground mb-4">
          Aucune session liée à ce projet pour l'instant.
        </p>
        <Link
          href={newSessionHref}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium"
        >
          <CalendarDays className="h-4 w-4" />
          Créer une session liée à ce projet
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projet.sessions.length} session{projet.sessions.length > 1 ? "s" : ""} liée
          {projet.sessions.length > 1 ? "s" : ""} à ce projet
        </p>
        <Link
          href={newSessionHref}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm font-medium"
        >
          <CalendarDays className="h-4 w-4" /> Nouvelle session
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Formation</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2">Lieu</th>
              <th className="px-3 py-2">Formateur</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Inscrits</th>
            </tr>
          </thead>
          <tbody>
            {projet.sessions.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2">
                  <Link href={`/sessions/${s.id}`} className="font-medium hover:underline">
                    {s.formation.titre}
                  </Link>
                  <p className="text-xs text-muted-foreground">{s.formation.duree} h</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  {fmtDate(s.dateDebut)} → {fmtDate(s.dateFin)}
                </td>
                <td className="px-3 py-2 text-xs">{s.lieu ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {s.statut}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{s._count.inscriptions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsTab({ projet }: { projet: ProjetDetail }) {
  // Les documents sont liés via Session.documents ou Entreprise.documents
  // dans le schéma actuel. Pour cet onglet, on liste les types de docs
  // disponibles avec des liens vers les sections concernées.
  return (
    <div className="space-y-4">
      <Panel title="Documents du projet">
        <p className="text-sm text-muted-foreground">
          Les documents (conventions, attestations, feuilles de présence,
          devis signés…) sont rattachés aux sessions et aux factures de ce
          projet. Utilise les onglets dédiés pour y accéder.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <DocCard
            icon={FileText}
            label="Conventions"
            href={`/documents?projetId=${projet.id}&type=convention`}
            count={projet.devis.filter((d) => d.statut === "signe").length}
          />
          <DocCard
            icon={FileText}
            label="Attestations"
            href={`/documents?projetId=${projet.id}&type=attestation`}
            count={projet.kpis.nbSessionsTerminees}
          />
          <DocCard
            icon={FileText}
            label="Feuilles de présence"
            href={`/emargement?projetId=${projet.id}`}
            count={projet.sessions.length}
          />
        </div>
      </Panel>
    </div>
  );
}

function FinanceTab({ projet }: { projet: ProjetDetail }) {
  const { kpis } = projet;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Kpi
          icon={Banknote}
          label="CA encaissé"
          value={fmtEur(kpis.caEncaisse)}
          hint="Factures payées uniquement"
          tone="good"
        />
        <Kpi
          icon={Euro}
          label="CA prévisionnel"
          value={fmtEur(kpis.caPrevisionnel)}
          hint="Factures non payées + devis signés restant à facturer"
        />
        <Kpi
          icon={FileText}
          label="Pipe commercial"
          value={fmtEur(kpis.caDevisEnvoyes)}
          hint="Devis envoyés non signés"
        />
        <Kpi
          icon={Euro}
          label="Budget restant"
          value={fmtEur(kpis.budgetRestant)}
          hint={projet.budget ? `Sur ${fmtEur(projet.budget)} alloué` : "Pas de budget défini"}
          tone={
            kpis.budgetRestant != null && kpis.budgetRestant < 0 ? "bad" : undefined
          }
        />
      </section>

      <Panel
        title={`Devis (${projet.devis.length})`}
        action={
          <Link
            href={`/commercial/devis/nouveau?projetId=${projet.id}${projet.entreprise ? `&entrepriseId=${projet.entreprise.id}` : ""}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            + Nouveau devis
          </Link>
        }
      >
        {projet.devis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun devis lié.</p>
        ) : (
          <ul className="divide-y divide-border">
            {projet.devis.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/commercial/devis/${d.id}`}
                    className="font-medium hover:underline"
                  >
                    {d.numero}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{d.objet}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5">{d.statut}</span>
                  <span className="font-medium">{fmtEur(d.montantTTC)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={`Factures (${projet.factures.length})`}
        action={
          <Link
            href={`/commercial/factures/nouveau?projetId=${projet.id}${projet.entreprise ? `&entrepriseId=${projet.entreprise.id}` : ""}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            + Nouvelle facture
          </Link>
        }
      >
        {projet.factures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune facture liée.</p>
        ) : (
          <ul className="divide-y divide-border">
            {projet.factures.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/commercial/factures/${f.id}`}
                    className="font-medium hover:underline"
                  >
                    {f.numero}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Émission {fmtDate(f.dateEmission)} · Échéance{" "}
                    {fmtDate(f.dateEcheance)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      f.statut === "payee"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : f.statut === "en_retard"
                          ? "bg-red-500/15 text-red-700 dark:text-red-300"
                          : "bg-muted"
                    }`}
                  >
                    {f.statut}
                  </span>
                  <span className="font-medium">{fmtEur(f.montantTTC)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type KpiProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad";
};

function Kpi({ icon: Icon, label, value, hint, tone }: KpiProps) {
  const toneClass =
    tone === "good"
      ? "border-emerald-700/40 bg-emerald-900/10"
      : tone === "warn"
        ? "border-amber-700/40 bg-amber-900/10"
        : tone === "bad"
          ? "border-red-700/40 bg-red-900/10"
          : "border-border bg-card";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/40 py-2 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function DocCard({
  icon: Icon,
  label,
  href,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border border-border bg-background p-3 hover:bg-muted/40"
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">
          {count} document{count > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
