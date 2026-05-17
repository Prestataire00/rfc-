"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
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
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  ClipboardList,
  AlertCircle,
  Clock,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { ProjetTachesPanel } from "@/components/projets/ProjetTachesPanel";

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
  demandes: Array<{
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

// Onglets principaux : Wizard (parcours 5 étapes) + Sessions + Finance.
const TABS = [
  { id: "wizard", label: "Détail projet", icon: Activity },
  { id: "sessions", label: "Sessions", icon: CalendarDays },
  { id: "finance", label: "Finance", icon: Banknote },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Étapes du wizard interne.
const WIZARD_STEPS = [
  { num: 1, key: "informations", label: "Informations", icon: Info },
  { num: 2, key: "description", label: "Description", icon: FileText },
  { num: 3, key: "taches", label: "Tâches", icon: ListChecks },
  { num: 4, key: "documents", label: "Documents", icon: FolderOpen },
  { num: 5, key: "progression", label: "Progression", icon: Activity },
] as const;

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
  const [tab, setTab] = useState<TabId>("wizard");
  const [step, setStep] = useState<number>(1);
  const [duplicating, setDuplicating] = useState(false);

  const { data: projet, isLoading, error, mutate } = useApi<ProjetDetail>(
    `/api/projets/${params.id}`,
  );

  async function changeStatut(statut: string) {
    if (!projet) return;
    try {
      await api.put(`/api/projets/${projet.id}`, { statut });
      notify.success(`Statut → ${statut}`);
      mutate();
    } catch {
      notify.error("Impossible de changer le statut");
    }
  }

  async function handleDuplicate() {
    if (!projet) return;
    const ok = window.confirm(`Dupliquer le projet « ${projet.nom} » ?`);
    if (!ok) return;
    setDuplicating(true);
    try {
      const copy = await api.post<{ id: string; nom: string }>(
        `/api/projets/${projet.id}/duplicate`,
        {},
      );
      notify.success(`Projet dupliqué : « ${copy.nom} »`);
      router.push(`/projets/${copy.id}`);
    } catch {
      notify.error("Impossible de dupliquer le projet");
    } finally {
      setDuplicating(false);
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
    <div className="space-y-6 p-6 pb-24">
      {/* HEADER : titre, sous-titre client, badge statut + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/projets")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Retour
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <p className="text-xs text-muted-foreground">{projet.code ?? "—"}</p>
          </div>
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
          {projet.entreprise ? (
            <p className="text-sm text-muted-foreground">
              <Link href={`/entreprises/${projet.entreprise.id}`} className="hover:underline">
                {projet.entreprise.nom}
              </Link>
            </p>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDuplicate}
          disabled={duplicating}
        >
          <Copy className="mr-1 h-4 w-4" />
          {duplicating ? "Duplication…" : "Dupliquer"}
        </Button>
      </div>

      {/* Actions statut */}
      <div className="flex flex-wrap gap-2">
        {projet.statut !== "en_cours" ? (
          <Button variant="outline" size="sm" onClick={() => changeStatut("en_cours")}>
            <PlayCircle className="mr-1 h-4 w-4" /> Démarrer
          </Button>
        ) : null}
        {projet.statut === "en_cours" ? (
          <Button variant="outline" size="sm" onClick={() => changeStatut("en_pause")}>
            <PauseCircle className="mr-1 h-4 w-4" /> Mettre en pause
          </Button>
        ) : null}
        {!["termine", "archive"].includes(projet.statut) ? (
          <Button variant="outline" size="sm" onClick={() => changeStatut("termine")}>
            <CheckCircle2 className="mr-1 h-4 w-4" /> Terminer
          </Button>
        ) : null}
        {projet.statut !== "archive" ? (
          <Button variant="outline" size="sm" onClick={() => changeStatut("archive")}>
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

      {/* Onglets principaux : Wizard | Sessions | Finance */}
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

      {tab === "wizard" ? (
        <WizardContainer projet={projet} step={step} onStepChange={setStep} />
      ) : null}
      {tab === "sessions" ? <SessionsTab projet={projet} /> : null}
      {tab === "finance" ? <FinanceTab projet={projet} /> : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Wizard 5 étapes : Informations / Description / Tâches / Documents / Progression
// ────────────────────────────────────────────────────────────────────────────

function WizardContainer({
  projet,
  step,
  onStepChange,
}: {
  projet: ProjetDetail;
  step: number;
  onStepChange: (n: number) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Contenu de l'étape courante */}
      {step === 1 ? <Step1Informations projet={projet} /> : null}
      {step === 2 ? <Step2Description projet={projet} /> : null}
      {step === 3 ? <TachesTab projetId={projet.id} /> : null}
      {step === 4 ? <Step4Documents projet={projet} /> : null}
      {step === 5 ? <Step5Progression projet={projet} /> : null}

      {/* Stepper bottom bar */}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-4 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStepChange(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Précédent
        </Button>

        <div className="flex items-center gap-3">
          {WIZARD_STEPS.map((s) => {
            const active = step === s.num;
            return (
              <button
                key={s.num}
                onClick={() => onStepChange(s.num)}
                className={`flex flex-col items-center gap-1 transition-opacity ${
                  active ? "" : "opacity-60 hover:opacity-100"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-red-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.num}
                </span>
                <span className={`text-xs ${active ? "font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          size="sm"
          onClick={() => onStepChange(Math.min(5, step + 1))}
          disabled={step === 5}
        >
          Étape suivante <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ──── Étape 1 : Informations ────────────────────────────────────────────────
function Step1Informations({ projet }: { projet: ProjetDetail }) {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Dates de la mission">
          <Row icon={Calendar} label="Date de début" value={fmtDate(projet.dateDebut)} />
          <Row icon={Calendar} label="Date de fin prévue" value={fmtDate(projet.dateFinPrevue)} />
          <Row icon={Calendar} label="Date de fin réelle" value={fmtDate(projet.dateFinReelle)} />
        </Panel>

        <Panel title="Pilotage">
          <Row icon={UsersIcon} label="Chef de projet" value={projet.chefProjet ?? "—"} />
          <Row icon={Tag} label="Priorité" value={projet.priorite} />
          <Row icon={Euro} label="Budget" value={fmtEur(projet.budget)} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Client">
          {projet.entreprise ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                <Link href={`/entreprises/${projet.entreprise.id}`} className="hover:underline">
                  {projet.entreprise.nom}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                {projet.entreprise.ville ?? "—"} ·{" "}
                {projet.entreprise.email ?? projet.entreprise.telephone ?? "—"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun client rattaché.</p>
          )}
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
    </div>
  );
}

// ──── Étape 2 : Description ─────────────────────────────────────────────────
function Step2Description({ projet }: { projet: ProjetDetail }) {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Description / Cadrage
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/projets/${projet.id}/editer`)}
          >
            Modifier
          </Button>
        </div>
        {projet.description ? (
          <p className="whitespace-pre-wrap text-sm">{projet.description}</p>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ClipboardList className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune description renseignée</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push(`/projets/${projet.id}/editer`)}
            >
              Ajouter une description
            </Button>
          </div>
        )}
      </section>

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
    </div>
  );
}

// ──── Étape 4 : Documents ───────────────────────────────────────────────────
function Step4Documents({ projet }: { projet: ProjetDetail }) {
  return (
    <Panel
      title="Documents du projet"
      action={
        <Link
          href={`/projets/${projet.id}/documents`}
          className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90"
        >
          Ouvrir la gestion des documents →
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground mb-4">
        La page dédiée permet d&apos;ajouter des documents (livrables, contrats,
        briefs, rapports…) et de choisir <strong>qui peut les voir</strong> : le
        client uniquement, le(s) formateur(s) uniquement, les deux, ou personne.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DocCard
          icon={FileText}
          label="Conventions (devis signés)"
          href={`/documents?projetId=${projet.id}&type=convention`}
          count={projet.devis.filter((d) => d.statut === "signe").length}
        />
        <DocCard
          icon={FileText}
          label="Attestations (sessions terminées)"
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
  );
}

// ──── Étape 5 : Progression (KPIs tâches + résumé par statut) ───────────────
function Step5Progression({ projet }: { projet: ProjetDetail }) {
  type TacheRow = {
    id: string;
    completed: boolean;
    dueDate: string | null;
    priorite: string | null;
  };
  type TachesResp = {
    lists: Array<{ items: TacheRow[] }>;
    stats: { totalItems: number; completedItems: number; percent: number };
  };
  const { data: taches } = useApi<TachesResp>(`/api/projets/${projet.id}/taches`);

  const allItems: TacheRow[] = taches?.lists.flatMap((l) => l.items) ?? [];
  const now = Date.now();
  const total = allItems.length;
  const completed = allItems.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const enRetard = allItems.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate).getTime() < now,
  ).length;
  const prioritaire = allItems.filter(
    (t) => !t.completed && (t.priorite === "haute" || t.priorite === "urgente"),
  ).length;
  const aFaire = allItems.filter(
    (t) =>
      !t.completed &&
      !(t.dueDate && new Date(t.dueDate).getTime() < now) &&
      !(t.priorite === "haute" || t.priorite === "urgente"),
  ).length;
  const sansObjet = total === 0 ? 1 : 0; // placeholder visuel quand aucune tâche

  const participantsPrevus = projet.sessions.reduce(
    (acc, s) => acc + (s._count?.inscriptions ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Progression de la mission</h2>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-3xl font-bold text-blue-600">{percent}%</p>
          <p className="mt-1 text-sm text-muted-foreground">Progression globale</p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-3xl font-bold">{completed}/{total}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tâches complétées</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-3xl font-bold">{participantsPrevus}</p>
          <p className="mt-1 text-sm text-muted-foreground">Participants prévus</p>
        </div>
      </section>

      {/* Statut */}
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Statut de la mission
            </h3>
            <p className="mt-1 text-sm">{projet.statut}</p>
          </div>
        </div>
      </section>

      {/* Résumé des tâches */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Résumé des tâches
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <SummaryCard count={aFaire} label="À faire" tone="neutral" icon={ListChecks} />
          <SummaryCard count={prioritaire} label="Prioritaire" tone="warn" icon={AlertCircle} />
          <SummaryCard count={enRetard} label="En retard" tone="bad" icon={Clock} />
          <SummaryCard count={completed} label="Terminé" tone="good" icon={CheckCircle2} />
          <SummaryCard count={sansObjet} label="Sans objet" tone="muted" icon={Archive} />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  count,
  label,
  tone,
  icon: Icon,
}: {
  count: number;
  label: string;
  tone: "neutral" | "warn" | "bad" | "good" | "muted";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/30"
      : tone === "warn"
        ? "border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30"
        : tone === "bad"
          ? "border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-950/30"
          : tone === "muted"
            ? "border-border bg-muted/30"
            : "border-border bg-background";
  return (
    <div className={`rounded-lg border p-4 text-center ${toneClass}`}>
      <Icon className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TachesTab({ projetId }: { projetId: string }) {
  return <ProjetTachesPanel projetId={projetId} />;
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
