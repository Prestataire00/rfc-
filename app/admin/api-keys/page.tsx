"use client";

import { useState } from "react";
import {
  Key, Plus, Trash2, Copy, AlertTriangle, Check,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError, api } from "@/lib/fetcher";
import { formatDate, formatDatetime } from "@/lib/utils";

interface ApiKey {
  id: string;
  nom: string;
  prefix: string;
  permissions: string;
  lastUsedAt: string | null;
  expireAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface CreatedKey {
  id: string;
  nom: string;
  prefix: string;
  permissions: string;
  expireAt: string | null;
  createdAt: string;
  key: string;
}

const PERMISSIONS = [
  "sessions:read",
  "sessions:write",
  "contacts:read",
  "contacts:write",
  "evaluations:read",
  "kpi:read",
  "*",
];

function parsePermissions(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function statusOf(k: ApiKey): { label: string; color: string } {
  if (k.revokedAt) return { label: "Revoquee", color: "bg-red-600/30 text-red-700 dark:text-red-300" };
  if (k.expireAt && new Date(k.expireAt).getTime() < Date.now()) {
    return { label: "Expiree", color: "bg-amber-500/20 text-amber-700 dark:text-amber-300" };
  }
  return { label: "Active", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" };
}

export default function ApiKeysPage() {
  const [openCreate, setOpenCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    permissions: [] as string[],
    expireAt: "",
  });

  const { data, isLoading } = useApi<ApiKey[]>("/api/api-keys");
  const items = data ?? [];

  const { trigger: createKey, isMutating: creating } = useApiMutation<
    Record<string, unknown>,
    CreatedKey
  >("/api/api-keys", "POST");

  const togglePermission = (p: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(p)
        ? prev.permissions.filter((x) => x !== p)
        : [...prev.permissions, p],
    }));
  };

  const handleCreate = async () => {
    if (!form.nom.trim()) {
      notify.error("Le nom est requis");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        nom: form.nom.trim(),
        permissions: form.permissions,
      };
      if (form.expireAt) payload.expireAt = new Date(form.expireAt).toISOString();
      const res = await createKey(payload);
      await invalidate("/api/api-keys");
      setOpenCreate(false);
      setForm({ nom: "", permissions: [], expireAt: "" });
      setCreatedKey(res);
      notify.success("Cle API creee");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de la creation";
      notify.error("Erreur", msg);
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    try {
      await api.delete(`/api/api-keys/${confirmRevoke.id}`);
      await invalidate("/api/api-keys");
      notify.success("Cle revoquee");
      setConfirmRevoke(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de la revocation";
      notify.error("Erreur", msg);
    }
  };

  const copyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Copie impossible");
    }
  };

  return (
    <div>
      <PageHeader
        title="Cles API"
        description="Generez et gerez les cles d'acces a l'API Rescue Formation"
      />

      <div className="flex items-center justify-end mb-5">
        <Button onClick={() => setOpenCreate(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4" /> Nouvelle cle API
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} cols={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Key}
          title="Aucune cle API"
          description="Creez votre premiere cle pour acceder a l'API."
        />
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-3 text-left">Nom</th>
                <th className="px-3 py-3 text-left">Prefix</th>
                <th className="px-3 py-3 text-left">Permissions</th>
                <th className="px-3 py-3 text-left">Creee</th>
                <th className="px-3 py-3 text-left">Derniere utilisation</th>
                <th className="px-3 py-3 text-left">Expire</th>
                <th className="px-3 py-3 text-center">Statut</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((k) => {
                const status = statusOf(k);
                const perms = parsePermissions(k.permissions);
                return (
                  <tr key={k.id} className="hover:bg-gray-750">
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">{k.nom}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                      rfc_{k.prefix}…
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {perms.length === 0 ? (
                          <span className="text-xs text-gray-500">-</span>
                        ) : (
                          perms.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(k.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {k.lastUsedAt ? formatDatetime(k.lastUsedAt) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {k.expireAt ? formatDate(k.expireAt) : "Jamais"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setConfirmRevoke(k)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-400"
                        aria-label="Revoquer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent
          onClose={() => setOpenCreate(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>Nouvelle cle API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom <span className="text-red-500">*</span></Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="ex: Integration Make.com"
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                {PERMISSIONS.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p)}
                      onChange={() => togglePermission(p)}
                      className="accent-red-600"
                    />
                    <span className="font-mono text-xs">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;expiration (optionnel)</Label>
              <Input
                type="date"
                value={form.expireAt}
                onChange={(e) => setForm({ ...form, expireAt: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-red-600 hover:bg-red-700"
            >
              {creating ? "Creation..." : "Creer la cle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-shot key reveal modal */}
      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent
          onClose={() => setCreatedKey(null)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-red-400" /> Cle API generee
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">
                Copiez cette cle maintenant. Elle ne sera plus jamais affichee
                pour des raisons de securite.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Cle complete</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdKey?.key ?? ""}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={copyKey}
                  variant="outline"
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" /> Copie
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copier
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCreatedKey(null)}
              className="bg-red-600 hover:bg-red-700"
            >
              J&apos;ai sauvegarde la cle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmRevoke}
        onOpenChange={(o) => !o && setConfirmRevoke(null)}
        title="Revoquer cette cle ?"
        description={`La cle "${confirmRevoke?.nom ?? ""}" sera revoquee immediatement et ne pourra plus etre utilisee.`}
        confirmLabel="Revoquer"
        onConfirm={handleRevoke}
      />
    </div>
  );
}
