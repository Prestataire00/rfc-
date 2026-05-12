"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap, Mail, Phone, Euro, FileText, Pencil, Trash2, Calendar,
  Receipt, CreditCard, ListChecks, BookOpen, CheckCircle2, Circle,
  AlertCircle, FolderOpen,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency, parseSpecialites, cn } from "@/lib/utils";
import { useApi, useApiMutation } from "@/hooks/useApi";

interface Formation {
  id: string;
  titre: string;
}

interface Session {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: keyof typeof SESSION_STATUTS;
  lieu: string | null;
  formation: Formation;
}

interface FactureFormateur {
  id: string;
  numero: string;
  sessionId: string | null;
  session: (Session & { formation: Formation }) | null;
  montantHT: number;
  montantTTC: number;
  tauxTVA: number;
  datePrestation: string;
  dateEmission: string;
  datePaiement: string | null;
  statut: string; // a_payer | paye | refuse
  fichierUrl: string | null;
}

interface NoteFrais {
  id: string;
  categorie: string;
  description: string;
  montant: number;
  date: string;
  lieu: string | null;
  statut: string; // soumise | approuvee | rejetee | payee
  justificatifUrl: string | null;
  commentaireAdmin: string | null;
}

interface TaskItemDto {
  id: string;
  titre: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  priorite: string | null; // basse | moyenne | haute | urgente
  list: { id: string; nom: string; couleur: string };
}

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  specialites: string;
  tarifJournalier: number | null;
  notes: string | null;
  sessions: Session[];
  factures: FactureFormateur[];
  notesFrais: NoteFrais[];
  taches: TaskItemDto[];
  user: { id: string; nom: string; prenom: string; email: string } | null;
  createdAt: string;
}

type TabKey =
  | "informations"
  | "sessions"
  | "formations"
  | "factures"
  | "notes-frais"
  | "taches";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "informations", label: "Informations", icon: GraduationCap },
  { key: "sessions", label: "Sessions", icon: Calendar },
  { key: "formations", label: "Formations", icon: BookOpen },
  { key: "factures", label: "Factures", icon: CreditCard },
  { key: "notes-frais", label: "Notes de frais", icon: Receipt },
  { key: "taches", label: "Tâches", icon: ListChecks },
];

const FACTURE_STATUTS: Record<string, { label: string; color: string }> = {
  a_payer: { label: "À payer", color: "amber" },
  paye: { label: "Payée", color: "emerald" },
  refuse: { label: "Refusée", color: "red" },
};

const NOTE_STATUTS: Record<string, { label: string; color: string }> = {
  soumise: { label: "Soumise", color: "blue" },
  approuvee: { label: "Approuvée", color: "emerald" },
  rejetee: { label: "Rejetée", color: "red" },
  payee: { label: "Payée", color: "violet" },
};

const PRIORITE_STYLES: Record<string, string> = {
  urgente: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  haute: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  moyenne: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  basse: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

const BADGE_TONES: Record<string, string> = {
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", BADGE_TONES[tone] ?? BADGE_TONES["blue"])}>
      {children}
    </span>
  );
}

export default function FormateurDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<TabKey>("informations");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: formateur, error, isLoading: loading } = useApi<Formateur>(`/api/formateurs/${id}`);
  const { trigger: deleteFormateur } = useApiMutation(`/api/formateurs/${id}`, "DELETE");

  const handleDelete = async () => {
    try {
      await deleteFormateur();
      router.push("/formateurs");
    } catch {
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !formateur) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error?.message || "Formateur introuvable"}</p>
        <Link href="/formateurs" className="text-red-600 hover:underline text-sm mt-2 inline-block">
          Retour aux formateurs
        </Link>
      </div>
    );
  }

  const specialites = parseSpecialites(formateur.specialites);
  const now = new Date();
  const sessionsPassees = formateur.sessions.filter((s) => new Date(s.dateFin) < now);
  const sessionsAVenir = formateur.sessions.filter((s) => new Date(s.dateDebut) >= now);
  const initials = `${formateur.prenom[0] ?? ""}${formateur.nom[0] ?? ""}`.toUpperCase();

  const counts = {
    sessions: formateur.sessions.length,
    factures: formateur.factures.length,
    notesFrais: formateur.notesFrais.length,
    taches: formateur.taches.filter((t) => !t.completed).length,
  };

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Formateurs", href: "/formateurs" },
        { label: `${formateur.prenom} ${formateur.nom}` },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6 mt-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-300 font-semibold text-sm shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formateur.prenom} {formateur.nom}
            </h1>
            {specialites.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {specialites.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/formateurs/${id}/modifier`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        <nav className="flex gap-6 min-w-max">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            const active = activeTab === t.key;
            const count =
              t.key === "sessions" ? counts.sessions :
              t.key === "factures" ? counts.factures :
              t.key === "notes-frais" ? counts.notesFrais :
              t.key === "taches" ? counts.taches :
              null;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "pb-3 inline-flex items-center gap-2 text-sm font-medium border-b-2 transition-colors",
                  active
                    ? "border-red-600 text-red-600 dark:text-red-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                )}
              >
                <TabIcon className="h-4 w-4" />
                {t.label}
                {count != null && count > 0 && (
                  <span className={cn(
                    "rounded-full text-[10px] font-semibold min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center tabular-nums",
                    active
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === "informations" && (
        <InformationsTab
          formateur={formateur}
          sessionsAVenirCount={sessionsAVenir.length}
          sessionsPasseesCount={sessionsPassees.length}
        />
      )}
      {activeTab === "sessions" && (
        <SessionsTab sessionsAVenir={sessionsAVenir} sessionsPassees={sessionsPassees} />
      )}
      {activeTab === "formations" && (
        <FormationsTab sessions={formateur.sessions} />
      )}
      {activeTab === "factures" && (
        <FacturesTab factures={formateur.factures} />
      )}
      {activeTab === "notes-frais" && (
        <NotesFraisTab notes={formateur.notesFrais} />
      )}
      {activeTab === "taches" && (
        <TachesTab taches={formateur.taches} hasUser={!!formateur.user} />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Supprimer ce formateur ?"
        description="Cette action est irréversible. Les sessions liées resteront mais sans formateur attribué."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Informations — coordonnées + KPI sessions
// ──────────────────────────────────────────────────────────────────────────────
function InformationsTab({
  formateur,
  sessionsAVenirCount,
  sessionsPasseesCount,
}: {
  formateur: Formateur;
  sessionsAVenirCount: number;
  sessionsPasseesCount: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Coordonnées (col 1) */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Coordonnées</h3>
        <div className="space-y-3">
          {formateur.email && (
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              <a href={`mailto:${formateur.email}`} className="text-sm text-red-600 dark:text-red-400 hover:underline truncate">
                {formateur.email}
              </a>
            </div>
          )}
          {formateur.telephone && (
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-gray-400 shrink-0" />
              <a href={`tel:${formateur.telephone}`} className="text-sm text-gray-700 dark:text-gray-300 hover:underline">
                {formateur.telephone}
              </a>
            </div>
          )}
          {formateur.tarifJournalier != null && (
            <div className="flex items-center gap-2.5">
              <Euro className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {formatCurrency(formateur.tarifJournalier)} / jour
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Ajouté le {formatDate(formateur.createdAt)}
            </span>
          </div>
        </div>
        {formateur.notes && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{formateur.notes}</p>
          </div>
        )}
      </div>

      {/* KPI sessions (col 2-3) */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        <KpiPanel value={sessionsAVenirCount} label="Sessions à venir" tone="red" />
        <KpiPanel value={sessionsPasseesCount} label="Sessions passées" tone="emerald" />
      </div>
    </div>
  );
}

function KpiPanel({ value, label, tone }: { value: number; label: string; tone: "red" | "emerald" }) {
  const valueColor = tone === "red" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-col items-center justify-center py-8 px-4">
      <p className={cn("text-3xl font-bold tabular-nums", valueColor)}>{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Sessions
// ──────────────────────────────────────────────────────────────────────────────
function SessionsTab({ sessionsAVenir, sessionsPassees }: { sessionsAVenir: Session[]; sessionsPassees: Session[] }) {
  if (sessionsAVenir.length === 0 && sessionsPassees.length === 0) {
    return <EmptyState icon={Calendar} message="Aucune session" />;
  }
  return (
    <div className="space-y-6">
      {sessionsAVenir.length > 0 && (
        <SectionWithTable
          title="Sessions à venir"
          count={sessionsAVenir.length}
          icon={BookOpen}
          accent="red"
        >
          <SessionsTable sessions={sessionsAVenir} />
        </SectionWithTable>
      )}
      {sessionsPassees.length > 0 && (
        <SectionWithTable
          title="Sessions passées"
          count={sessionsPassees.length}
          icon={Calendar}
          accent="gray"
        >
          <SessionsTable sessions={sessionsPassees} />
        </SectionWithTable>
      )}
    </div>
  );
}

function SessionsTable({ sessions }: { sessions: Session[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-900/40">
        <tr>
          <Th>Formation</Th>
          <Th>Dates</Th>
          <Th>Lieu</Th>
          <Th>Statut</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
        {sessions.map((s) => {
          const statutInfo = SESSION_STATUTS[s.statut];
          return (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
              <Td>
                <Link href={`/formations/${s.formation.id}`} className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
                  {s.formation.titre}
                </Link>
              </Td>
              <Td>
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(s.dateDebut)} → {formatDate(s.dateFin)}
                </span>
              </Td>
              <Td>{s.lieu || <span className="text-gray-400">—</span>}</Td>
              <Td>{statutInfo && <StatutBadge label={statutInfo.label} color={statutInfo.color} />}</Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Formations (dérivé des sessions, distinct par formation)
// ──────────────────────────────────────────────────────────────────────────────
function FormationsTab({ sessions }: { sessions: Session[] }) {
  const formationsAvecStats = useMemo(() => {
    const m = new Map<string, { formation: Formation; total: number; aVenir: number; passees: number }>();
    const now = new Date();
    for (const s of sessions) {
      const existing = m.get(s.formation.id);
      const isAVenir = new Date(s.dateDebut) >= now;
      if (existing) {
        existing.total += 1;
        if (isAVenir) existing.aVenir += 1;
        else existing.passees += 1;
      } else {
        m.set(s.formation.id, {
          formation: s.formation,
          total: 1,
          aVenir: isAVenir ? 1 : 0,
          passees: isAVenir ? 0 : 1,
        });
      }
    }
    return Array.from(m.values());
  }, [sessions]);

  if (formationsAvecStats.length === 0) {
    return <EmptyState icon={BookOpen} message="Aucune formation assignée" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {formationsAvecStats.map(({ formation, total, aVenir, passees }) => (
        <Link
          key={formation.id}
          href={`/formations/${formation.id}`}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-red-500/50 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {formation.titre}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {total} session{total > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
            <span><span className="font-semibold text-red-600 dark:text-red-400">{aVenir}</span> à venir</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span><span className="font-semibold text-emerald-600 dark:text-emerald-400">{passees}</span> passée{passees > 1 ? "s" : ""}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Factures
// ──────────────────────────────────────────────────────────────────────────────
function FacturesTab({ factures }: { factures: FactureFormateur[] }) {
  if (factures.length === 0) {
    return <EmptyState icon={CreditCard} message="Aucune facture émise" />;
  }
  const totalHT = factures.reduce((sum, f) => sum + f.montantHT, 0);
  const totalTTC = factures.reduce((sum, f) => sum + f.montantTTC, 0);
  const totalPaye = factures.filter((f) => f.statut === "paye").reduce((sum, f) => sum + f.montantTTC, 0);
  const totalAPayer = factures.filter((f) => f.statut === "a_payer").reduce((sum, f) => sum + f.montantTTC, 0);

  return (
    <div className="space-y-4">
      {/* KPI factures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total HT" value={formatCurrency(totalHT)} tone="gray" />
        <KpiCard label="Total TTC" value={formatCurrency(totalTTC)} tone="gray" />
        <KpiCard label="Payé" value={formatCurrency(totalPaye)} tone="emerald" />
        <KpiCard label="À payer" value={formatCurrency(totalAPayer)} tone="amber" />
      </div>

      {/* Table factures */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <Th>N° facture</Th>
              <Th>Session</Th>
              <Th>Date prestation</Th>
              <Th>Montant TTC</Th>
              <Th>Statut</Th>
              <Th>Justif.</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {factures.map((f) => {
              const st = FACTURE_STATUTS[f.statut] ?? { label: f.statut, color: "blue" };
              return (
                <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td>
                    <Link href={`/formateurs/factures/${f.id}`} className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
                      {f.numero}
                    </Link>
                  </Td>
                  <Td>
                    {f.session ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{f.session.formation.titre}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(f.datePrestation)}</span>
                  </Td>
                  <Td>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(f.montantTTC)}</span>
                  </Td>
                  <Td><Badge tone={st.color}>{st.label}</Badge></Td>
                  <Td>
                    {f.fichierUrl ? (
                      <a href={f.fichierUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 dark:text-red-400 hover:underline">
                        Voir
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Notes de frais
// ──────────────────────────────────────────────────────────────────────────────
function NotesFraisTab({ notes }: { notes: NoteFrais[] }) {
  if (notes.length === 0) {
    return <EmptyState icon={Receipt} message="Aucune note de frais soumise" />;
  }
  const totalSoumis = notes.filter((n) => n.statut === "soumise").reduce((s, n) => s + n.montant, 0);
  const totalApprouve = notes.filter((n) => n.statut === "approuvee").reduce((s, n) => s + n.montant, 0);
  const totalPaye = notes.filter((n) => n.statut === "payee").reduce((s, n) => s + n.montant, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Soumis" value={formatCurrency(totalSoumis)} tone="blue" />
        <KpiCard label="Approuvé" value={formatCurrency(totalApprouve)} tone="emerald" />
        <KpiCard label="Payé" value={formatCurrency(totalPaye)} tone="violet" />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <Th>Date</Th>
              <Th>Catégorie</Th>
              <Th>Description</Th>
              <Th>Montant</Th>
              <Th>Statut</Th>
              <Th>Justif.</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {notes.map((n) => {
              const st = NOTE_STATUTS[n.statut] ?? { label: n.statut, color: "blue" };
              return (
                <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td>
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(n.date)}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{n.categorie}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs block">{n.description}</span>
                    {n.lieu && <span className="text-[11px] text-gray-400">{n.lieu}</span>}
                  </Td>
                  <Td>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(n.montant)}</span>
                  </Td>
                  <Td><Badge tone={st.color}>{st.label}</Badge></Td>
                  <Td>
                    {n.justificatifUrl ? (
                      <a href={n.justificatifUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 dark:text-red-400 hover:underline">
                        Voir
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Tâches
// ──────────────────────────────────────────────────────────────────────────────
function TachesTab({ taches, hasUser }: { taches: TaskItemDto[]; hasUser: boolean }) {
  if (!hasUser) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Pas de compte utilisateur lié</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
            Ce formateur n&apos;a pas encore de compte sur la plateforme. Les tâches ne peuvent être assignées qu&apos;à un utilisateur connecté.
          </p>
        </div>
      </div>
    );
  }
  if (taches.length === 0) {
    return <EmptyState icon={ListChecks} message="Aucune tâche assignée" />;
  }

  const enCours = taches.filter((t) => !t.completed);
  const terminees = taches.filter((t) => t.completed);

  return (
    <div className="space-y-6">
      {enCours.length > 0 && (
        <SectionWithTable
          title="En cours"
          count={enCours.length}
          icon={Circle}
          accent="red"
        >
          <TachesTable taches={enCours} />
        </SectionWithTable>
      )}
      {terminees.length > 0 && (
        <SectionWithTable
          title="Terminées"
          count={terminees.length}
          icon={CheckCircle2}
          accent="emerald"
        >
          <TachesTable taches={terminees} />
        </SectionWithTable>
      )}
    </div>
  );
}

function TachesTable({ taches }: { taches: TaskItemDto[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-900/40">
        <tr>
          <Th>État</Th>
          <Th>Titre</Th>
          <Th>Liste</Th>
          <Th>Priorité</Th>
          <Th>Échéance</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
        {taches.map((t) => (
          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
            <Td>
              {t.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400" />
              )}
            </Td>
            <Td>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t.titre}</p>
              {t.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">{t.description}</p>
              )}
            </Td>
            <Td>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ background: t.list.couleur }} />
                {t.list.nom}
              </span>
            </Td>
            <Td>
              {t.priorite ? (
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", PRIORITE_STYLES[t.priorite] ?? PRIORITE_STYLES["basse"])}>
                  {t.priorite}
                </span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </Td>
            <Td>
              {t.dueDate ? (
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(t.dueDate)}</span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Utils partagés
// ──────────────────────────────────────────────────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
      <Icon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

function SectionWithTable({
  title,
  count,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  accent: "red" | "emerald" | "gray";
  children: React.ReactNode;
}) {
  const accentColor =
    accent === "red" ? "text-red-600 dark:text-red-400" :
    accent === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
    "text-gray-500 dark:text-gray-400";
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", accentColor)} />
        {title}
        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({count})</span>
      </h3>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "gray" | "emerald" | "amber" | "blue" | "violet" }) {
  const valueColor = {
    gray: "text-gray-900 dark:text-white",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    violet: "text-violet-600 dark:text-violet-400",
  }[tone];
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</p>
      <p className={cn("text-xl font-bold mt-1 tabular-nums", valueColor)}>{value}</p>
    </div>
  );
}

// Discriminé pour éviter ESLint useless var unused (FolderOpen importé mais inutilisé pour le moment)
void FolderOpen;
