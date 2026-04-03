"use client";

import { useState, useEffect } from "react";
import {
  Shield, ChevronDown, ChevronRight, FileText, Plus, X,
  CheckCircle2, Clock, AlertTriangle, Ban, Filter, Sparkles, ExternalLink,
} from "lucide-react";
import type { PreuveAuto } from "@/lib/qualiopi-auto-preuves";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn, formatDate } from "@/lib/utils";

type Preuve = {
  id: string;
  createdAt: string;
  indicateurId: string;
  titre: string;
  description: string | null;
  fichierUrl: string | null;
  type: string;
  valide: boolean;
};

type Indicateur = {
  id: string;
  numero: number;
  critere: number;
  libelle: string;
  description: string | null;
  preuvesAttendues: string | null;
  statut: string;
  commentaire: string | null;
  dateAudit: string | null;
  prioritaire: boolean;
  preuves: Preuve[];
};

type Stats = {
  total: number;
  conformes: number;
  enCours: number;
  nonConformes: number;
  nonApplicables: number;
  conformitePercent: number;
};

const CRITERE_LABELS: Record<number, string> = {
  1: "Information du public sur les prestations",
  2: "Identification precise des objectifs et adaptation",
  3: "Adaptation des prestations et des moyens pedagogiques",
  4: "Adequation des moyens pedagogiques, techniques et d'encadrement",
  5: "Qualification et competences des personnels",
  6: "Inscription dans l'environnement professionnel",
  7: "Recueil et prise en compte des appreciations et reclamations",
};

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  conforme: { label: "Conforme", bg: "bg-green-900/30", text: "text-green-400", icon: CheckCircle2 },
  en_cours: { label: "En cours", bg: "bg-amber-900/30", text: "text-amber-400", icon: Clock },
  non_conforme: { label: "Non conforme", bg: "bg-red-900/30", text: "text-red-400", icon: AlertTriangle },
  non_applicable: { label: "N/A", bg: "bg-gray-700", text: "text-gray-400", icon: Ban },
};

const PREUVE_TYPES = [
  { value: "document", label: "Document" },
  { value: "process", label: "Processus" },
  { value: "enregistrement", label: "Enregistrement" },
  { value: "temoignage", label: "Temoignage" },
];

export default function QualiopiPage() {
  const [indicateurs, setIndicateurs] = useState<Indicateur[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, conformes: 0, enCours: 0, nonConformes: 0, nonApplicables: 0, conformitePercent: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedCriteres, setExpandedCriteres] = useState<Record<number, boolean>>({ 1: true });
  const [selectedIndicateur, setSelectedIndicateur] = useState<Indicateur | null>(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail panel form state
  const [editStatut, setEditStatut] = useState("");
  const [editCommentaire, setEditCommentaire] = useState("");
  const [editDateAudit, setEditDateAudit] = useState("");
  const [editPrioritaire, setEditPrioritaire] = useState(false);

  // Auto preuves from CRM data
  const [autoPreuves, setAutoPreuves] = useState<Record<number, PreuveAuto>>({});

  // New preuve form
  const [showPreuveForm, setShowPreuveForm] = useState(false);
  const [newPreuve, setNewPreuve] = useState({ titre: "", description: "", type: "document", fichierUrl: "" });

  const fetchData = () => {
    fetch("/api/qualiopi")
      .then((r) => r.ok ? r.json() : { indicateurs: [], stats: {} })
      .then((data) => {
        setIndicateurs(data.indicateurs);
        setStats(data.stats);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    fetch("/api/qualiopi/auto-preuves")
      .then((r) => r.ok ? r.json() : {})
      .then(setAutoPreuves);
  }, []);

  const toggleCritere = (num: number) => {
    setExpandedCriteres((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const openDetail = (ind: Indicateur) => {
    setSelectedIndicateur(ind);
    setEditStatut(ind.statut);
    setEditCommentaire(ind.commentaire || "");
    setEditDateAudit(ind.dateAudit ? ind.dateAudit.split("T")[0] : "");
    setEditPrioritaire(ind.prioritaire);
    setShowPreuveForm(false);
    setNewPreuve({ titre: "", description: "", type: "document", fichierUrl: "" });
  };

  const closeDetail = () => {
    setSelectedIndicateur(null);
  };

  const saveIndicateur = async () => {
    if (!selectedIndicateur) return;
    setSaving(true);
    const res = await fetch("/api/qualiopi", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedIndicateur.id,
        statut: editStatut,
        commentaire: editCommentaire || null,
        dateAudit: editDateAudit || null,
        prioritaire: editPrioritaire,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setIndicateurs((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIndicateur(updated);
      // Recompute stats
      fetchData();
    }
    setSaving(false);
  };

  const addPreuve = async () => {
    if (!selectedIndicateur || !newPreuve.titre) return;
    setSaving(true);
    const res = await fetch(`/api/qualiopi/${selectedIndicateur.id}/preuves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPreuve),
    });
    if (res.ok) {
      setShowPreuveForm(false);
      setNewPreuve({ titre: "", description: "", type: "document", fichierUrl: "" });
      fetchData();
      // Refresh detail
      const preuvesRes = await fetch(`/api/qualiopi/${selectedIndicateur.id}/preuves`);
      const preuves = await preuvesRes.json();
      setSelectedIndicateur((prev) => prev ? { ...prev, preuves } : null);
    }
    setSaving(false);
  };

  // Group indicateurs by critere
  const groupedByCritere: Record<number, Indicateur[]> = {};
  for (const ind of indicateurs) {
    if (!groupedByCritere[ind.critere]) groupedByCritere[ind.critere] = [];
    groupedByCritere[ind.critere].push(ind);
  }

  const filteredGrouped: Record<number, Indicateur[]> = {};
  for (const [critere, inds] of Object.entries(groupedByCritere)) {
    const filtered = filterStatut ? inds.filter((i) => i.statut === filterStatut) : inds;
    if (filtered.length > 0) {
      filteredGrouped[Number(critere)] = filtered;
    }
  }

  const getCritereConformity = (inds: Indicateur[]) => {
    const applicable = inds.filter((i) => i.statut !== "non_applicable");
    const conformes = applicable.filter((i) => i.statut === "conforme");
    return applicable.length > 0 ? Math.round((conformes.length / applicable.length) * 100) : 100;
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Qualiopi" description="Suivi de la conformite aux indicateurs Qualiopi" />
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Qualiopi" description="Suivi de la conformite aux indicateurs du referentiel national qualite" />

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Conformite globale</p>
          <p className="text-2xl font-bold text-red-600">{stats.conformitePercent}%</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Conformes</p>
          <p className="text-2xl font-bold text-green-600">{stats.conformes}</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">En cours</p>
          <p className="text-2xl font-bold text-amber-600">{stats.enCours}</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Non conformes</p>
          <p className="text-2xl font-bold text-red-600">{stats.nonConformes}</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Non applicables</p>
          <p className="text-2xl font-bold text-gray-400">{stats.nonApplicables}</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="rounded-lg border bg-gray-800 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Progression globale</span>
          <span className="text-sm font-semibold text-red-600">{stats.conformitePercent}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 rounded-full transition-all duration-500"
            style={{ width: `${stats.conformitePercent}%` }}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="conforme">Conforme</option>
          <option value="en_cours">En cours</option>
          <option value="non_conforme">Non conforme</option>
          <option value="non_applicable">Non applicable</option>
        </select>
      </div>

      {/* Criteres accordion */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7].map((critNum) => {
          const inds = filteredGrouped[critNum];
          if (!inds && filterStatut) return null;
          const allInds = groupedByCritere[critNum] || [];
          const conformity = getCritereConformity(allInds);
          const isExpanded = expandedCriteres[critNum];

          return (
            <div key={critNum} className="rounded-lg border bg-gray-800 overflow-hidden">
              {/* Critere header */}
              <button
                onClick={() => toggleCritere(critNum)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold text-gray-100">
                    Critere {critNum}
                  </span>
                  <span className="text-sm text-gray-400 ml-2">
                    {CRITERE_LABELS[critNum]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        conformity >= 80 ? "bg-green-900/200" : conformity >= 50 ? "bg-amber-900/200" : "bg-red-900/200"
                      )}
                      style={{ width: `${conformity}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium w-10 text-right",
                    conformity >= 80 ? "text-green-600" : conformity >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {conformity}%
                  </span>
                </div>
              </button>

              {/* Indicateurs list */}
              {isExpanded && (inds || allInds).length > 0 && (
                <div className="border-t divide-y">
                  {(inds || allInds).map((ind) => {
                    const config = STATUT_CONFIG[ind.statut] || STATUT_CONFIG.non_conforme;
                    const StatusIcon = config.icon;
                    return (
                      <div
                        key={ind.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => openDetail(ind)}
                      >
                        <span className="text-xs font-mono text-gray-400 w-6 text-right flex-shrink-0">
                          {ind.numero}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-100 truncate">{ind.libelle}</p>
                        </div>
                        {ind.prioritaire && (
                          <span className="inline-flex rounded-full bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-400">
                            Prioritaire
                          </span>
                        )}
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", config.bg, config.text)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <div className="flex items-center gap-1 text-gray-400">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="text-xs">{ind.preuves.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel / modal */}
      {selectedIndicateur && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50" onClick={closeDetail} />
          <div className="relative z-50 w-full max-w-lg bg-gray-800 h-full overflow-y-auto shadow-xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Indicateur {selectedIndicateur.numero} - Critere {selectedIndicateur.critere}</p>
                <h2 className="text-lg font-semibold text-gray-100">{selectedIndicateur.libelle}</h2>
              </div>
              <button onClick={closeDetail} className="p-1 rounded-md hover:bg-gray-700">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedIndicateur.description && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                  <p className="text-sm text-gray-300">{selectedIndicateur.description}</p>
                </div>
              )}

              {/* Preuves attendues */}
              {selectedIndicateur.preuvesAttendues && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Preuves attendues</label>
                  <p className="text-sm text-gray-300">{selectedIndicateur.preuvesAttendues}</p>
                </div>
              )}

              {/* Statut */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Statut</label>
                <select
                  value={editStatut}
                  onChange={(e) => setEditStatut(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
                >
                  <option value="conforme">Conforme</option>
                  <option value="en_cours">En cours</option>
                  <option value="non_conforme">Non conforme</option>
                  <option value="non_applicable">Non applicable</option>
                </select>
              </div>

              {/* Date audit */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Date d&apos;audit</label>
                <input
                  type="date"
                  value={editDateAudit}
                  onChange={(e) => setEditDateAudit(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
                />
              </div>

              {/* Prioritaire */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prioritaire"
                  checked={editPrioritaire}
                  onChange={(e) => setEditPrioritaire(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-red-600"
                />
                <label htmlFor="prioritaire" className="text-sm text-gray-300">Marquer comme prioritaire</label>
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Commentaire</label>
                <textarea
                  value={editCommentaire}
                  onChange={(e) => setEditCommentaire(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm resize-none"
                  placeholder="Ajouter un commentaire..."
                />
              </div>

              {/* Save button */}
              <button
                onClick={saveIndicateur}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>

              {/* Preuves section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-100">
                    Preuves ({selectedIndicateur.preuves.length})
                  </h3>
                  <button
                    onClick={() => setShowPreuveForm(!showPreuveForm)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-400 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                </div>

                {/* Add preuve form */}
                {showPreuveForm && (
                  <div className="rounded-lg border bg-gray-900 p-4 mb-3 space-y-3">
                    <input
                      type="text"
                      value={newPreuve.titre}
                      onChange={(e) => setNewPreuve({ ...newPreuve, titre: e.target.value })}
                      placeholder="Titre de la preuve"
                      className="w-full h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
                    />
                    <textarea
                      value={newPreuve.description}
                      onChange={(e) => setNewPreuve({ ...newPreuve, description: e.target.value })}
                      placeholder="Description (optionnel)"
                      rows={2}
                      className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm resize-none"
                    />
                    <select
                      value={newPreuve.type}
                      onChange={(e) => setNewPreuve({ ...newPreuve, type: e.target.value })}
                      className="w-full h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
                    >
                      {PREUVE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newPreuve.fichierUrl}
                      onChange={(e) => setNewPreuve({ ...newPreuve, fichierUrl: e.target.value })}
                      placeholder="URL du fichier (optionnel)"
                      className="w-full h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addPreuve}
                        disabled={saving || !newPreuve.titre}
                        className="flex-1 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Ajouter la preuve
                      </button>
                      <button
                        onClick={() => setShowPreuveForm(false)}
                        className="px-3 py-2 text-xs font-medium text-gray-400 hover:bg-gray-200 rounded-md"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Preuves list */}
                {selectedIndicateur.preuves.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune preuve ajoutee</p>
                ) : (
                  <div className="space-y-2">
                    {selectedIndicateur.preuves.map((p) => (
                      <div key={p.id} className="rounded-lg border bg-gray-800 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-100">{p.titre}</p>
                            {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                          </div>
                          <span className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            p.valide ? "bg-green-900/30 text-green-400" : "bg-gray-700 text-gray-400"
                          )}>
                            {p.valide ? "Validé" : "À valider"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {PREUVE_TYPES.find((t) => t.value === p.type)?.label || p.type}
                          </span>
                          {p.fichierUrl && (
                            <a href={p.fichierUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:underline">
                              Voir le fichier
                            </a>
                          )}
                          <span className="text-xs text-gray-400">{formatDate(p.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preuves automatiques CRM */}
              {autoPreuves[selectedIndicateur.numero] && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-green-400" />
                    <h3 className="text-sm font-semibold text-gray-100">Preuves automatiques CRM</h3>
                  </div>
                  {autoPreuves[selectedIndicateur.numero].disponible ? (
                    <div className="rounded-lg border border-dashed border-green-700 bg-green-900/10 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-700">
                              <Sparkles className="h-2.5 w-2.5" /> Auto
                            </span>
                            <p className="text-sm font-medium text-gray-100">
                              {autoPreuves[selectedIndicateur.numero].titre}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">
                            {autoPreuves[selectedIndicateur.numero].description}
                          </p>
                        </div>
                        <a
                          href={autoPreuves[selectedIndicateur.numero].lien}
                          className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium whitespace-nowrap flex-shrink-0"
                        >
                          Voir dans le CRM <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/30 p-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-400">
                          <Sparkles className="h-2.5 w-2.5" /> Auto
                        </span>
                        <p className="text-sm text-gray-100">{autoPreuves[selectedIndicateur.numero].titre}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-1">Aucune donnée disponible dans le CRM</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
