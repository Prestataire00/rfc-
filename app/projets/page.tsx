"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  Building2,
  Users as UsersIcon,
  Euro,
} from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { formatDatetime } from "@/lib/utils";

type ProjetRow = {
  id: string;
  nom: string;
  code: string | null;
  description: string | null;
  statut: string;
  priorite: string;
  dateDebut: string | null;
  dateFinPrevue: string | null;
  dateFinReelle: string | null;
  budget: number | null;
  chefProjet: string | null;
  createdAt: string;
  updatedAt: string;
  entreprise: { id: string; nom: string } | null;
  formateurs: Array<{ formateur: { id: string; nom: string; prenom: string } }>;
  _count: { besoins: number; devis: number; sessions: number; factures: number };
};

type Page = {
  items: ProjetRow[];
  total: number;
  page: number;
  perPage: number;
  statuts: string[];
};

const STATUT_META: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  brouillon: {
    label: "Brouillon",
    color: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    dot: "bg-slate-500",
  },
  en_cours: {
    label: "En cours",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  en_pause: {
    label: "En pause",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  termine: {
    label: "Terminé",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  archive: {
    label: "Archivé",
    color: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
    dot: "bg-gray-500",
  },
};

const PRIORITE_META: Record<string, { label: string; color: string }> = {
  basse: { label: "Basse", color: "text-slate-500" },
  normale: { label: "Normale", color: "text-blue-500" },
  haute: { label: "Haute", color: "text-amber-500" },
  critique: { label: "Critique", color: "text-red-600" },
};

function fmtEur(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProjetsListPage() {
  const [statuts, setStatuts] = useState<Set<string>>(
    new Set(["brouillon", "en_cours", "en_pause"]),
  );
  const [priorite, setPriorite] = useState("");
  const [q, setQ] = useState("");
  const [retardOnly, setRetardOnly] = useState(false);
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (statuts.size > 0) params.set("statut", Array.from(statuts).join(","));
    if (priorite) params.set("priorite", priorite);
    if (q) params.set("q", q);
    if (retardOnly) params.set("retard", "true");
    params.set("page", String(page));
    params.set("perPage", "20");
    return params.toString();
  }, [statuts, priorite, q, retardOnly, page]);

  const { data, isLoading, error } = useApi<Page>(`/api/projets?${query}`);

  const toggleStatut = (s: string) =>
    setStatuts((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 1;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Projets"
        description="Engagements clients agrégés — formations, devis, factures et formateurs liés à chaque projet."
        actionLabel="Nouveau projet"
        actionHref="/projets/nouveau"
      />

      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {Object.keys(STATUT_META).map((s) => {
            const meta = STATUT_META[s];
            const active = statuts.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatut(s)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? `${meta.color} border-current`
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher (nom, code, description)…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div>
            <Label htmlFor="filter-priorite" className="sr-only">
              Priorité
            </Label>
            <select
              id="filter-priorite"
              value={priorite}
              onChange={(e) => {
                setPriorite(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Toutes priorités</option>
              <option value="critique">Critique</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={retardOnly}
              onChange={(e) => {
                setRetardOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-input"
            />
            <AlertTriangle className="h-4 w-4 text-red-500" />
            En retard uniquement
          </label>
        </div>
      </section>

      {isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : error ? (
        <EmptyState
          icon={Filter}
          title="Erreur de chargement"
          description={error.message}
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Aucun projet"
          description="Aucun projet ne correspond à ces filtres. Tu peux en créer un nouveau."
          actionLabel="Nouveau projet"
          actionHref="/projets/nouveau"
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.total} projet{data.total > 1 ? "s" : ""} — page {data.page}/
            {totalPages}
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((p) => (
              <ProjetCard key={p.id} projet={p} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
              >
                Précédent
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
              >
                Suivant
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ProjetCard({ projet }: { projet: ProjetRow }) {
  const meta = STATUT_META[projet.statut] ?? STATUT_META.brouillon;
  const priorite = PRIORITE_META[projet.priorite] ?? PRIORITE_META.normale;

  const now = Date.now();
  const enRetard =
    projet.dateFinPrevue != null &&
    new Date(projet.dateFinPrevue).getTime() < now &&
    !["termine", "archive"].includes(projet.statut);

  return (
    <Link
      href={`/projets/${projet.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{projet.code ?? "—"}</p>
          <h3 className="truncate text-base font-semibold">{projet.nom}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      {projet.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {projet.description}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {projet.entreprise ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{projet.entreprise.nom}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-1 text-muted-foreground">
          <UsersIcon className="h-3 w-3" />
          {projet.formateurs.length} formateur
          {projet.formateurs.length > 1 ? "s" : ""}
        </div>
        {projet.dateFinPrevue ? (
          <div
            className={`flex items-center gap-1 ${
              enRetard ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {enRetard ? "Retard" : "Fin"} :{" "}
            {new Date(projet.dateFinPrevue).toLocaleDateString("fr-FR")}
          </div>
        ) : null}
        <div className={`flex items-center gap-1 ${priorite.color}`}>
          Priorité {priorite.label}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
        <div className="flex gap-3 text-muted-foreground">
          <span title="Besoins">{projet._count.besoins} bes.</span>
          <span title="Devis">{projet._count.devis} dev.</span>
          <span title="Sessions">{projet._count.sessions} sess.</span>
          <span title="Factures">{projet._count.factures} fact.</span>
        </div>
        {projet.budget ? (
          <div className="flex items-center gap-1 font-medium">
            <Euro className="h-3 w-3" />
            {fmtEur(projet.budget)}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
