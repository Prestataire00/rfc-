"use client";

import { useMemo, useState } from "react";
import { ScrollText, Filter, ChevronDown, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { formatDatetime } from "@/lib/utils";

type AuditLogRow = {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  actorIp: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
};

type Page = { items: AuditLogRow[]; nextCursor: string | null };

const ACTION_FAMILIES: { value: string; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "auth.login", label: "auth.login" },
  { value: "auth.login_failed", label: "auth.login_failed" },
  { value: "user.create", label: "user.create" },
  { value: "user.update", label: "user.update" },
  { value: "user.role_change", label: "user.role_change" },
  { value: "user.deactivate", label: "user.deactivate" },
  { value: "user.delete", label: "user.delete" },
  { value: "devis.sign", label: "devis.sign" },
  { value: "facture.overdue_detected", label: "facture.overdue_detected" },
  { value: "signature.signed", label: "signature.signed" },
];

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  formateur: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  client: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  system: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export default function AuditLogsPage() {
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (resourceType) params.set("resourceType", resourceType);
    if (actorEmail) params.set("actorEmail", actorEmail);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("take", "100");
    return params.toString();
  }, [action, resourceType, actorEmail, from, to]);

  const { data, isLoading, error } = useApi<Page>(
    `/api/audit-logs?${queryString}`,
  );

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Journal d'audit"
        description="Trace immuable des actions sensibles (auth, devis, signature, RGPD). Conservation conforme Qualiopi."
      />

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-5">
        <div>
          <Label htmlFor="filter-action" className="text-xs">
            Action
          </Label>
          <select
            id="filter-action"
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            {ACTION_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-resource" className="text-xs">
            Type ressource
          </Label>
          <Input
            id="filter-resource"
            placeholder="User, Devis…"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="filter-actor" className="text-xs">
            Email acteur
          </Label>
          <Input
            id="filter-actor"
            placeholder="alice@…"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="filter-from" className="text-xs">
            Depuis
          </Label>
          <Input
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="filter-to" className="text-xs">
            Jusqu'à
          </Label>
          <Input
            id="filter-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : error ? (
        <EmptyState
          icon={Filter}
          title="Erreur de chargement"
          description={error.message}
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Aucun événement"
          description="Aucun log d'audit ne correspond aux filtres."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-8 px-3 py-2"></th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Acteur</th>
                <th className="px-3 py-2">Ressource</th>
                <th className="px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((log) => {
                const isOpen = expanded.has(log.id);
                const roleColor =
                  ROLE_COLOR[log.actorRole ?? ""] ??
                  "bg-slate-500/15 text-slate-700 dark:text-slate-300";
                return (
                  <>
                    <tr
                      key={log.id}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => toggleRow(log.id)}
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                        {formatDatetime(log.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {log.action}
                        </code>
                      </td>
                      <td className="px-3 py-2">
                        {log.actorEmail ?? (
                          <span className="text-muted-foreground italic">
                            système
                          </span>
                        )}
                        {log.actorRole ? (
                          <span
                            className={`ml-2 rounded px-1.5 py-0.5 text-xs ${roleColor}`}
                          >
                            {log.actorRole}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {log.resourceType}
                        {log.resourceId ? (
                          <span className="text-muted-foreground">
                            :{log.resourceId.slice(0, 8)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {log.actorIp ?? "—"}
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr key={log.id + "-meta"} className="border-t border-border bg-muted/10">
                        <td colSpan={6} className="px-6 py-3">
                          <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
                            {JSON.stringify(log.metadata ?? {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}
            </tbody>
          </table>
          {data.nextCursor ? (
            <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
              Pagination : cette page contient 100 lignes. Affiner les filtres
              pour voir plus loin.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
