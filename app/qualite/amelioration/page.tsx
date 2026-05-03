"use client";

import { useMemo, useState } from "react";
import {
  Plus, Trash2, Copy, ExternalLink, RefreshCw, Sparkles, Loader2,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError, api } from "@/lib/fetcher";
import { formatDate } from "@/lib/utils";

interface Action {
  id: string;
  description: string;
  actionMenee: string;
  resultat: string | null;
  responsable: string | null;
  statut: string;
  dateOuverture: string;
  dateCloture: string | null;
  source: string | null;
}

interface Incident {
  id: string;
  nom: string;
  description: string;
  source: string;
  sujet: string;
  gravite: string;
  dateIncident: string;
  actionMenee: string | null;
  statut: string;
}

interface Partage {
  id: string;
  token: string;
  nom: string;
  expireAt: string | null;
  actif: boolean;
  createdAt: string;
}

const TABS = [
  { value: "actions", label: "Actions correctives" },
  { value: "incidents", label: "Incidents" },
  { value: "partages", label: "Partages publics" },
] as const;

const ACTION_STATUTS = [
  { value: "ouverte", label: "Ouverte", color: "bg-amber-500/20 text-amber-300" },
  { value: "en_cours", label: "En cours", color: "bg-blue-500/20 text-blue-300" },
  { value: "cloturee", label: "Cloturee", color: "bg-emerald-500/20 text-emerald-300" },
];

const INCIDENT_GRAVITES = [
  { value: "Faible", label: "Faible", color: "bg-gray-700 text-gray-300" },
  { value: "Modere", label: "Modere", color: "bg-amber-500/20 text-amber-300" },
  { value: "Grave", label: "Grave", color: "bg-red-600/30 text-red-300" },
];

const SOURCES = [
  { value: "", label: "Toutes les sources" },
  { value: "audit", label: "Audit" },
  { value: "eval_chaud", label: "Eval a chaud" },
  { value: "eval_froid", label: "Eval a froid" },
  { value: "incident", label: "Incident" },
  { value: "autre", label: "Autre" },
];

export default function QualiteAmeliorationPage() {
  const [tab, setTab] = useState<typeof TABS[number]["value"]>("actions");
  const [filterSource, setFilterSource] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterGravite, setFilterGravite] = useState("");

  // ----- ACTIONS -----
  const actionsUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (filterSource) p.set("source", filterSource);
    if (filterStatut) p.set("statut", filterStatut);
    return `/api/qualite/actions${p.toString() ? `?${p.toString()}` : ""}`;
  }, [filterSource, filterStatut]);
  const { data: actions, mutate: mutateActions } = useApi<Action[]>(tab === "actions" ? actionsUrl : null);

  const [openAction, setOpenAction] = useState(false);
  const [actionForm, setActionForm] = useState({
    description: "",
    actionMenee: "",
    responsable: "",
    source: "",
    statut: "ouverte",
  });
  const { trigger: createAction, isMutating: savingAction } = useApiMutation<Record<string, unknown>>(
    "/api/qualite/actions",
    "POST"
  );

  const handleCreateAction = async () => {
    if (!actionForm.description.trim() || !actionForm.actionMenee.trim()) {
      notify.error("Description et action menee obligatoires");
      return;
    }
    try {
      await createAction({
        description: actionForm.description,
        actionMenee: actionForm.actionMenee,
        responsable: actionForm.responsable || null,
        source: actionForm.source || null,
        statut: actionForm.statut,
      });
      await mutateActions();
      notify.success("Action ajoutee");
      setOpenAction(false);
      setActionForm({ description: "", actionMenee: "", responsable: "", source: "", statut: "ouverte" });
    } catch (err) {
      notify.error("Erreur", err instanceof ApiError ? err.message : "");
    }
  };

  const handleDeleteAction = async (id: string) => {
    if (!window.confirm("Supprimer cette action ?")) return;
    try {
      await api.delete(`/api/qualite/actions/${id}`);
      await mutateActions();
      notify.success("Supprimee");
    } catch {
      notify.error("Erreur");
    }
  };

  // ----- INCIDENTS -----
  const incidentsUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (filterStatut) p.set("statut", filterStatut);
    if (filterGravite) p.set("gravite", filterGravite);
    return `/api/qualite/incidents${p.toString() ? `?${p.toString()}` : ""}`;
  }, [filterStatut, filterGravite]);
  const { data: incidents, mutate: mutateIncidents } = useApi<Incident[]>(tab === "incidents" ? incidentsUrl : null);

  const [openIncident, setOpenIncident] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    nom: "",
    description: "",
    source: "Apprenant",
    sujet: "Pedagogique",
    gravite: "Modere",
    dateIncident: new Date().toISOString().split("T")[0],
    actionMenee: "",
  });
  const { trigger: createIncident, isMutating: savingIncident } = useApiMutation<Record<string, unknown>>(
    "/api/qualite/incidents",
    "POST"
  );

  const handleCreateIncident = async () => {
    if (!incidentForm.nom.trim() || !incidentForm.description.trim()) {
      notify.error("Nom et description obligatoires");
      return;
    }
    try {
      await createIncident({
        ...incidentForm,
        actionMenee: incidentForm.actionMenee || null,
      });
      await mutateIncidents();
      notify.success("Incident enregistre");
      setOpenIncident(false);
      setIncidentForm({
        nom: "",
        description: "",
        source: "Apprenant",
        sujet: "Pedagogique",
        gravite: "Modere",
        dateIncident: new Date().toISOString().split("T")[0],
        actionMenee: "",
      });
    } catch (err) {
      notify.error("Erreur", err instanceof ApiError ? err.message : "");
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!window.confirm("Supprimer cet incident ?")) return;
    try {
      await api.delete(`/api/qualite/incidents/${id}`);
      await mutateIncidents();
      notify.success("Supprime");
    } catch {
      notify.error("Erreur");
    }
  };

  // ----- PARTAGES -----
  const { data: partages, mutate: mutatePartages } = useApi<Partage[]>(tab === "partages" ? "/api/qualite/partages" : null);

  const [openPartage, setOpenPartage] = useState(false);
  const [partageForm, setPartageForm] = useState({ nom: "", expireAt: "" });
  const { trigger: createPartage, isMutating: savingPartage } = useApiMutation<Record<string, unknown>, Partage>(
    "/api/qualite/partages",
    "POST"
  );

  const handleCreatePartage = async () => {
    if (!partageForm.nom.trim()) {
      notify.error("Nom obligatoire");
      return;
    }
    try {
      const created = await createPartage({
        nom: partageForm.nom,
        expireAt: partageForm.expireAt || null,
      });
      await mutatePartages();
      notify.success("Partage cree");
      setOpenPartage(false);
      setPartageForm({ nom: "", expireAt: "" });
      const url = `${window.location.origin}/qualite/share/${created.token}`;
      try {
        await navigator.clipboard.writeText(url);
        notify.info("Lien copie");
      } catch {}
    } catch (err) {
      notify.error("Erreur", err instanceof ApiError ? err.message : "");
    }
  };

  const handleTogglePartage = async (p: Partage) => {
    try {
      await api.put(`/api/qualite/partages/${p.id}`, {
        nom: p.nom,
        actif: !p.actif,
        expireAt: p.expireAt,
      });
      await mutatePartages();
    } catch {
      notify.error("Erreur");
    }
  };

  const handleDeletePartage = async (id: string) => {
    if (!window.confirm("Supprimer ce partage ?")) return;
    try {
      await api.delete(`/api/qualite/partages/${id}`);
      await mutatePartages();
      notify.success("Supprime");
    } catch {
      notify.error("Erreur");
    }
  };

  // ----- IA SUGGESTIONS -----
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaItems, setIaItems] = useState<Record<string, unknown>[]>([]);
  const [iaSelected, setIaSelected] = useState<boolean[]>([]);

  const fetchSuggestions = async (type: "amelioration" | "incident") => {
    setIaLoading(true);
    setIaItems([]);
    try {
      const data = await api.post<{ items: Record<string, unknown>[] }>("/api/ai/qualiopi/suggerer", {
        type,
        count: 4,
      });
      setIaItems(data.items ?? []);
      setIaSelected((data.items ?? []).map(() => true));
    } catch {
      notify.error("Suggestion IA indisponible");
    } finally {
      setIaLoading(false);
    }
  };

  const handleImportIA = async () => {
    const picked = iaItems.filter((_, i) => iaSelected[i]);
    if (picked.length === 0) {
      notify.error("Selectionnez au moins une suggestion");
      return;
    }
    let importedCount = 0;
    for (const item of picked) {
      try {
        if (tab === "actions") {
          await api.post("/api/qualite/actions", {
            description: String(item.description ?? ""),
            actionMenee: String(item.action_taken ?? item.actionMenee ?? "(IA)"),
            resultat: item.result ? String(item.result) : null,
            responsable: item.responsible ? String(item.responsible) : null,
            statut: "ouverte",
            source: "autre",
          });
        } else if (tab === "incidents") {
          await api.post("/api/qualite/incidents", {
            nom: String(item.nom ?? "Incident"),
            description: String(item.description ?? ""),
            source: String(item.source ?? "Apprenant"),
            sujet: String(item.sujet ?? "Pedagogique"),
            gravite: String(item.gravite ?? "Modere"),
            dateIncident: new Date().toISOString(),
            actionMenee: item.action_menee ? String(item.action_menee) : null,
          });
        }
        importedCount++;
      } catch {}
    }
    notify.success(`${importedCount} suggestion(s) importee(s)`);
    setIaOpen(false);
    setIaItems([]);
    setIaSelected([]);
    if (tab === "actions") await mutateActions();
    if (tab === "incidents") await mutateIncidents();
  };

  return (
    <div>
      <PageHeader
        title="Amelioration continue"
        description="Suivi des actions, incidents et partages publics (Qualiopi critere 32)"
      />

      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-700 mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setFilterStatut("");
              setFilterGravite("");
            }}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t.value ? "bg-red-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ACTIONS TAB */}
      {tab === "actions" && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                options={[{ value: "", label: "Tous statuts" }, ...ACTION_STATUTS.map((s) => ({ value: s.value, label: s.label }))]}
                className="bg-gray-800 border-gray-700 h-9 text-xs"
              />
              <Select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                options={SOURCES}
                className="bg-gray-800 border-gray-700 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIaOpen(true);
                  fetchSuggestions("amelioration");
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3 py-2 text-xs font-medium text-white"
              >
                <Sparkles className="h-3.5 w-3.5" /> Suggerer via IA
              </button>
              <Button onClick={() => setOpenAction(true)} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4" /> Nouvelle action
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ACTION_STATUTS.map((statut) => {
              const items = (actions ?? []).filter((a) => a.statut === statut.value);
              return (
                <div key={statut.value} className="rounded-xl border border-gray-700 bg-gray-800 p-3 min-h-[200px]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
                    {statut.label}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${statut.color}`}>{items.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {items.length === 0 && <p className="text-[11px] text-gray-500 text-center py-4">Vide</p>}
                    {items.map((a) => (
                      <div key={a.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3 group">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-gray-100 flex-1">{a.description}</p>
                          <button
                            onClick={() => handleDeleteAction(a.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{a.actionMenee}</p>
                        {a.responsable && (
                          <p className="text-[10px] text-gray-500 mt-1">Responsable : {a.responsable}</p>
                        )}
                        <p className="text-[10px] text-gray-500 mt-1">
                          Ouverte le {formatDate(a.dateOuverture)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INCIDENTS TAB */}
      {tab === "incidents" && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                options={[
                  { value: "", label: "Tous statuts" },
                  { value: "ouvert", label: "Ouvert" },
                  { value: "traite", label: "Traite" },
                  { value: "cloture", label: "Cloture" },
                ]}
                className="bg-gray-800 border-gray-700 h-9 text-xs"
              />
              <Select
                value={filterGravite}
                onChange={(e) => setFilterGravite(e.target.value)}
                options={[{ value: "", label: "Toutes gravites" }, ...INCIDENT_GRAVITES.map((g) => ({ value: g.value, label: g.label }))]}
                className="bg-gray-800 border-gray-700 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIaOpen(true);
                  fetchSuggestions("incident");
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3 py-2 text-xs font-medium text-white"
              >
                <Sparkles className="h-3.5 w-3.5" /> Suggerer via IA
              </button>
              <Button onClick={() => setOpenIncident(true)} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4" /> Nouvel incident
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Sujet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Gravite</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(incidents ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-500 py-12">Aucun incident</td></tr>
                ) : (
                  (incidents ?? []).map((i) => (
                    <tr key={i.id} className="hover:bg-gray-750 group">
                      <td className="px-4 py-3 text-gray-300 text-xs">{formatDate(i.dateIncident)}</td>
                      <td className="px-4 py-3 text-gray-100 text-sm">{i.nom}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{i.source}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{i.sujet}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold rounded px-2 py-0.5 ${
                          INCIDENT_GRAVITES.find((g) => g.value === i.gravite)?.color ?? ""
                        }`}>
                          {i.gravite}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{i.statut}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteIncident(i.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PARTAGES TAB */}
      {tab === "partages" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setOpenPartage(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" /> Nouveau partage
            </Button>
          </div>

          {(partages ?? []).length === 0 ? (
            <p className="text-center text-gray-500 py-12">Aucun partage cree</p>
          ) : (
            <div className="space-y-2">
              {(partages ?? []).map((p) => {
                const url = typeof window !== "undefined"
                  ? `${window.location.origin}/qualite/share/${p.token}`
                  : `/qualite/share/${p.token}`;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-gray-700 bg-gray-800 p-4 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-100">{p.nom}</p>
                        {p.actif ? (
                          <span className="text-[10px] font-bold uppercase rounded px-2 py-0.5 bg-emerald-500/20 text-emerald-300">
                            Actif
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase rounded px-2 py-0.5 bg-gray-700 text-gray-400">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{url}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Cree le {formatDate(p.createdAt)}
                        {p.expireAt && ` - expire le ${formatDate(p.expireAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => navigator.clipboard.writeText(url).then(() => notify.info("Lien copie"))}
                        className="p-2 rounded hover:bg-gray-700 text-gray-400"
                        title="Copier le lien"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded hover:bg-gray-700 text-gray-400"
                        title="Ouvrir"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleTogglePartage(p)}
                        className="p-2 rounded hover:bg-gray-700 text-gray-400"
                        title={p.actif ? "Desactiver" : "Activer"}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePartage(p.id)}
                        className="p-2 rounded hover:bg-red-600/20 text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal create action */}
      <Dialog open={openAction} onOpenChange={setOpenAction}>
        <DialogContent
          onClose={() => setOpenAction(false)}
          className="bg-gray-800 border-gray-700 text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Nouvelle action corrective</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                value={actionForm.description}
                onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                rows={2}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Action a mener *</Label>
              <Textarea
                value={actionForm.actionMenee}
                onChange={(e) => setActionForm({ ...actionForm, actionMenee: e.target.value })}
                rows={2}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={actionForm.source}
                  onChange={(e) => setActionForm({ ...actionForm, source: e.target.value })}
                  options={SOURCES}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={actionForm.statut}
                  onChange={(e) => setActionForm({ ...actionForm, statut: e.target.value })}
                  options={ACTION_STATUTS.map((s) => ({ value: s.value, label: s.label }))}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Input
                value={actionForm.responsable}
                onChange={(e) => setActionForm({ ...actionForm, responsable: e.target.value })}
                className="bg-gray-900 border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAction(false)}>Annuler</Button>
            <Button onClick={handleCreateAction} disabled={savingAction} className="bg-red-600 hover:bg-red-700">
              {savingAction ? "Creation..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal create incident */}
      <Dialog open={openIncident} onOpenChange={setOpenIncident}>
        <DialogContent
          onClose={() => setOpenIncident(false)}
          className="bg-gray-800 border-gray-700 text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Nouvel incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                value={incidentForm.nom}
                onChange={(e) => setIncidentForm({ ...incidentForm, nom: e.target.value })}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                value={incidentForm.description}
                onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                rows={3}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Source *</Label>
                <Select
                  value={incidentForm.source}
                  onChange={(e) => setIncidentForm({ ...incidentForm, source: e.target.value })}
                  options={[
                    { value: "Apprenant", label: "Apprenant" },
                    { value: "Entreprise", label: "Entreprise" },
                    { value: "Formateur", label: "Formateur" },
                  ]}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sujet *</Label>
                <Select
                  value={incidentForm.sujet}
                  onChange={(e) => setIncidentForm({ ...incidentForm, sujet: e.target.value })}
                  options={[
                    { value: "Pedagogique", label: "Pedagogique" },
                    { value: "Administratif", label: "Administratif" },
                    { value: "Technique", label: "Technique" },
                  ]}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gravite *</Label>
                <Select
                  value={incidentForm.gravite}
                  onChange={(e) => setIncidentForm({ ...incidentForm, gravite: e.target.value })}
                  options={INCIDENT_GRAVITES.map((g) => ({ value: g.value, label: g.label }))}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date incident</Label>
              <Input
                type="date"
                value={incidentForm.dateIncident}
                onChange={(e) => setIncidentForm({ ...incidentForm, dateIncident: e.target.value })}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Action menee</Label>
              <Textarea
                value={incidentForm.actionMenee}
                onChange={(e) => setIncidentForm({ ...incidentForm, actionMenee: e.target.value })}
                rows={2}
                className="bg-gray-900 border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIncident(false)}>Annuler</Button>
            <Button onClick={handleCreateIncident} disabled={savingIncident} className="bg-red-600 hover:bg-red-700">
              {savingIncident ? "Creation..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal create partage */}
      <Dialog open={openPartage} onOpenChange={setOpenPartage}>
        <DialogContent
          onClose={() => setOpenPartage(false)}
          className="bg-gray-800 border-gray-700 text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Nouveau partage public</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                value={partageForm.nom}
                onChange={(e) => setPartageForm({ ...partageForm, nom: e.target.value })}
                placeholder="ex: Audit OPCO 2026"
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;expiration (optionnel)</Label>
              <Input
                type="date"
                value={partageForm.expireAt}
                onChange={(e) => setPartageForm({ ...partageForm, expireAt: e.target.value })}
                className="bg-gray-900 border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPartage(false)}>Annuler</Button>
            <Button onClick={handleCreatePartage} disabled={savingPartage} className="bg-red-600 hover:bg-red-700">
              {savingPartage ? "Creation..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal IA suggestions */}
      <Dialog open={iaOpen} onOpenChange={setIaOpen}>
        <DialogContent
          onClose={() => setIaOpen(false)}
          className="bg-gray-800 border-gray-700 text-gray-100 max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-red-500" /> Suggestions IA
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {iaLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Generation en cours...
              </div>
            ) : iaItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8 flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" /> Aucune suggestion
              </p>
            ) : (
              <div className="space-y-2">
                {iaItems.map((item, i) => (
                  <label
                    key={i}
                    className="flex gap-3 p-3 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer hover:border-red-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={iaSelected[i] ?? false}
                      onChange={() =>
                        setIaSelected((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                      }
                      className="mt-1 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-600"
                    />
                    <div className="text-xs space-y-1 flex-1">
                      {Object.entries(item).map(([k, v]) => (
                        <p key={k}>
                          <span className="text-gray-400 font-semibold">{k} :</span>{" "}
                          <span className="text-gray-200">{String(v)}</span>
                        </p>
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIaOpen(false)}>Fermer</Button>
            <Button
              onClick={handleImportIA}
              disabled={iaItems.length === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Importer la selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
