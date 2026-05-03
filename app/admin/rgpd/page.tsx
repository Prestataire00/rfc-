"use client";

import { useMemo, useState } from "react";
import {
  Shield, Mail, FileText, CheckCircle2, XCircle, Clock, Eye,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useApi, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError, api } from "@/lib/fetcher";
import { formatDatetime } from "@/lib/utils";

interface DemandeRgpd {
  id: string;
  type: string;
  demandeurEmail: string;
  demandeurNom: string | null;
  statut: string;
  description: string | null;
  traiteParUserId: string | null;
  dateTraitement: string | null;
  justificatif: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUTS = [
  { value: "", label: "Tous" },
  { value: "recue", label: "Recue", color: "bg-blue-500/20 text-blue-300", Icon: Mail },
  { value: "en_traitement", label: "En traitement", color: "bg-amber-500/20 text-amber-300", Icon: Clock },
  { value: "traitee", label: "Traitee", color: "bg-emerald-500/20 text-emerald-300", Icon: CheckCircle2 },
  { value: "rejetee", label: "Rejetee", color: "bg-red-600/30 text-red-300", Icon: XCircle },
];

const TYPE_BADGE: Record<string, string> = {
  acces: "bg-blue-500/20 text-blue-300",
  rectification: "bg-amber-500/20 text-amber-300",
  effacement: "bg-red-600/30 text-red-300",
  portabilite: "bg-purple-500/20 text-purple-300",
  opposition: "bg-pink-500/20 text-pink-300",
};

const TYPE_LABEL: Record<string, string> = {
  acces: "Acces",
  rectification: "Rectification",
  effacement: "Effacement",
  portabilite: "Portabilite",
  opposition: "Opposition",
};

function statutMeta(s: string) {
  return STATUTS.find((x) => x.value === s);
}

export default function RgpdAdminPage() {
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [selected, setSelected] = useState<DemandeRgpd | null>(null);
  const [justificatif, setJustificatif] = useState("");
  const [saving, setSaving] = useState(false);

  const url = filterStatut
    ? `/api/rgpd/demandes?statut=${encodeURIComponent(filterStatut)}`
    : "/api/rgpd/demandes";

  const { data, isLoading, error } = useApi<DemandeRgpd[]>(url);
  const items = data ?? [];

  const sorted = useMemo(
    () => [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [items]
  );

  const openDetail = (d: DemandeRgpd) => {
    setSelected(d);
    setJustificatif(d.justificatif ?? "");
  };

  const transition = async (newStatut: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/api/rgpd/demandes/${selected.id}`, {
        type: selected.type,
        demandeurEmail: selected.demandeurEmail,
        demandeurNom: selected.demandeurNom,
        description: selected.description,
        statut: newStatut,
        justificatif: justificatif.trim() || null,
      });
      await invalidate(url);
      notify.success("Statut mis a jour");
      setSelected(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Demandes RGPD"
        description="Gerez les demandes des personnes concernees (acces, rectification, effacement, etc.)"
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {STATUTS.map((s) => (
          <button
            key={s.value || "all"}
            onClick={() => setFilterStatut(s.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filterStatut === s.value
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : error ? (
        <EmptyState
          icon={Shield}
          title="Erreur de chargement"
          description={error.message}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Aucune demande"
          description="Aucune demande RGPD ne correspond a ce filtre."
        />
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-left">Demandeur</th>
                <th className="px-3 py-3 text-left">Email</th>
                <th className="px-3 py-3 text-left">Date demande</th>
                <th className="px-3 py-3 text-center">Statut</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sorted.map((d) => {
                const sm = statutMeta(d.statut);
                const StIcon = sm?.Icon ?? Mail;
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-gray-750 cursor-pointer"
                    onClick={() => openDetail(d)}
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          TYPE_BADGE[d.type] ?? "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {TYPE_LABEL[d.type] ?? d.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-100">
                      {d.demandeurNom ?? <span className="text-gray-500 italic">Anonyme</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{d.demandeurEmail}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">
                      {formatDatetime(d.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          sm?.color ?? "bg-gray-700 text-gray-300"
                        }`}
                      >
                        <StIcon className="h-3 w-3" />
                        {sm?.label ?? d.statut}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(d);
                        }}
                        className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                        aria-label="Voir"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          onClose={() => setSelected(null)}
          className="bg-gray-800 border-gray-700 text-gray-100 max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" /> Demande RGPD
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-gray-400">Type</Label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        TYPE_BADGE[selected.type] ?? "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {TYPE_LABEL[selected.type] ?? selected.type}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Statut actuel</Label>
                  <div className="mt-1 text-gray-100">
                    {statutMeta(selected.statut)?.label ?? selected.statut}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Demandeur</Label>
                  <div className="mt-1 text-gray-100">
                    {selected.demandeurNom ?? <span className="text-gray-500 italic">Non renseigne</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Email</Label>
                  <div className="mt-1 text-gray-100">{selected.demandeurEmail}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Date demande</Label>
                  <div className="mt-1 text-gray-100">{formatDatetime(selected.createdAt)}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Date traitement</Label>
                  <div className="mt-1 text-gray-100">
                    {selected.dateTraitement ? formatDatetime(selected.dateTraitement) : "-"}
                  </div>
                </div>
              </div>
              {selected.description && (
                <div>
                  <Label className="text-xs text-gray-400">Description</Label>
                  <div className="mt-1 rounded-md bg-gray-900 border border-gray-700 p-3 text-sm text-gray-200 whitespace-pre-wrap">
                    {selected.description}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Justificatif / commentaire interne</Label>
                <Textarea
                  value={justificatif}
                  onChange={(e) => setJustificatif(e.target.value)}
                  rows={3}
                  placeholder="Commentaire libre, motif d'acceptation ou de rejet..."
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <div className="rounded-md border border-gray-700 bg-gray-900 p-3 text-xs text-gray-400 flex items-start gap-2">
                <FileText className="h-4 w-4 shrink-0 mt-0.5 text-gray-500" />
                <p>
                  Les transitions vers <strong>Traitee</strong> ou <strong>Rejetee</strong> enregistrent
                  automatiquement la date de traitement et l&apos;utilisateur ayant statue.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Fermer
            </Button>
            <Button
              variant="outline"
              onClick={() => transition("en_traitement")}
              disabled={saving}
            >
              <Clock className="h-4 w-4" /> En traitement
            </Button>
            <Button
              onClick={() => transition("traitee")}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Marquer traitee
            </Button>
            <Button
              variant="destructive"
              onClick={() => transition("rejetee")}
              disabled={saving}
            >
              <XCircle className="h-4 w-4" /> Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
