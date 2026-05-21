"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2, Users, ClipboardList, FileText, Receipt, Clock,
  MapPin, Mail, Phone, Globe, Hash, Pencil, Plus, ExternalLink,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEVIS_STATUTS, FACTURE_STATUTS, BESOIN_STATUTS, BESOIN_PRIORITES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { notify } from "@/lib/toast";
import { TYPE_ENTREPRISE_ENUM } from "@/lib/validations/entreprise";
import type { Entreprise, TabKey, HistoriqueAction } from "./types";

const FALLBACK_COLOR = "bg-gray-500/20 text-gray-400 border-gray-500/30";

function statutBadge(map: Record<string, { label: string; color: string }>, key: string) {
  const m = map[key];
  return <StatutBadge label={m?.label ?? key} color={m?.color ?? FALLBACK_COLOR} />;
}

export default function EntrepriseDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("infos");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const [historique, setHistorique] = useState<HistoriqueAction[] | null>(null);

  const fetchEntreprise = useCallback(async () => {
    const res = await fetch(`/api/entreprises/${id}`);
    if (!res.ok) throw new Error(res.status === 404 ? "Entreprise introuvable" : "Erreur de chargement");
    return (await res.json()) as Entreprise;
  }, [id]);

  useEffect(() => {
    fetchEntreprise()
      .then(setEntreprise)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchEntreprise]);

  useEffect(() => {
    if (activeTab !== "historique" || historique !== null) return;
    fetch(`/api/entreprises/${id}/historique`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setHistorique)
      .catch(() => setHistorique([]));
  }, [activeTab, historique, id]);

  function startEdit() {
    if (!entreprise) return;
    setForm({
      nom: entreprise.nom ?? "",
      secteur: entreprise.secteur ?? "",
      adresse: entreprise.adresse ?? "",
      ville: entreprise.ville ?? "",
      codePostal: entreprise.codePostal ?? "",
      siret: entreprise.siret ?? "",
      email: entreprise.email ?? "",
      telephone: entreprise.telephone ?? "",
      site: entreprise.site ?? "",
      notes: entreprise.notes ?? "",
      effectif: entreprise.effectif != null ? String(entreprise.effectif) : "",
      typeEntreprise: entreprise.typeEntreprise ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/entreprises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          effectif: form.effectif === "" ? null : Number(form.effectif),
          typeEntreprise: form.typeEntreprise === "" ? null : form.typeEntreprise,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Échec de l'enregistrement");
      }
      const refreshed = await fetchEntreprise();
      setEntreprise(refreshed);
      setEditing(false);
      notify.success("Entreprise mise à jour");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-400">Chargement…</div>;
  }
  if (error || !entreprise) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title={error ?? "Entreprise introuvable"}
          description="Cette entreprise n'existe pas ou a été supprimée."
          actionLabel="Retour aux entreprises"
          actionHref="/entreprises"
        />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof Users; count?: number }[] = [
    { key: "infos", label: "Infos", icon: Building2 },
    { key: "contacts", label: "Contacts", icon: Users, count: entreprise.contacts.length },
    { key: "besoins", label: "Besoins", icon: ClipboardList, count: entreprise.demandes.length },
    { key: "devis", label: "Devis", icon: FileText, count: entreprise.devis.length },
    { key: "factures", label: "Factures", icon: Receipt, count: entreprise.factures.length },
    { key: "historique", label: "Historique", icon: Clock },
  ];

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Entreprises", href: "/entreprises" },
          { label: entreprise.nom },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-red-500" />
            {entreprise.nom}
            {entreprise.typeEntreprise && (
              <span className="text-sm font-normal text-gray-500">({entreprise.typeEntreprise})</span>
            )}
          </h1>
          {entreprise.secteur && <p className="text-gray-400 mt-1">{entreprise.secteur}</p>}
        </div>
        <Link
          href={`/demandes/nouveau?entrepriseId=${entreprise.id}`}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle demande
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-red-600 text-red-500"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-700 px-1.5 text-[11px] font-medium text-gray-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB: Infos */}
      {activeTab === "infos" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Informations générales</CardTitle>
            {!editing && (
              <Button size="sm" variant="outline" onClick={startEdit} className="gap-2">
                <Pencil className="h-4 w-4" /> Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  ["nom", "Nom"],
                  ["secteur", "Secteur"],
                  ["siret", "SIRET"],
                  ["email", "Email"],
                  ["telephone", "Téléphone"],
                  ["site", "Site web"],
                  ["adresse", "Adresse"],
                  ["ville", "Ville"],
                  ["codePostal", "Code postal"],
                  ["effectif", "Effectif"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type={key === "effectif" ? "number" : "text"}
                      value={form[key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label htmlFor="typeEntreprise">Type d&apos;entreprise</Label>
                  <select
                    id="typeEntreprise"
                    value={form.typeEntreprise ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, typeEntreprise: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  >
                    <option value="">—</option>
                    {TYPE_ENTREPRISE_ENUM.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="flex w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={saveEdit} disabled={saving} className="bg-red-600 hover:bg-red-700">
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <InfoRow icon={Hash} label="SIRET" value={entreprise.siret} mono />
                <InfoRow icon={Mail} label="Email" value={entreprise.email} />
                <InfoRow icon={Phone} label="Téléphone" value={entreprise.telephone} />
                <InfoRow icon={Globe} label="Site web" value={entreprise.site} />
                <InfoRow
                  icon={MapPin}
                  label="Adresse"
                  value={[entreprise.adresse, [entreprise.codePostal, entreprise.ville].filter(Boolean).join(" ")]
                    .filter(Boolean)
                    .join(", ") || null}
                />
                <InfoRow icon={Users} label="Effectif" value={entreprise.effectif != null ? String(entreprise.effectif) : null} />
                {entreprise.notes && (
                  <div className="md:col-span-2 pt-2 border-t border-gray-700">
                    <dt className="text-gray-400 mb-1">Notes</dt>
                    <dd className="text-gray-200 whitespace-pre-wrap">{entreprise.notes}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB: Contacts */}
      {activeTab === "contacts" && (
        entreprise.contacts.length === 0 ? (
          <EmptyState icon={Users} title="Aucun contact" description="Aucun contact n'est rattaché à cette entreprise." />
        ) : (
          <DataTable headers={["Nom", "Poste", "Email", "Téléphone", "Type"]}>
            {entreprise.contacts.map((c) => (
              <tr key={c.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${c.id}`} className="text-red-500 hover:underline font-medium">
                    {c.prenom} {c.nom}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400">{c.poste ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">{c.email}</td>
                <td className="px-4 py-3 text-gray-400">{c.telephone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 capitalize">{c.type}</td>
              </tr>
            ))}
          </DataTable>
        )
      )}

      {/* TAB: Besoins */}
      {activeTab === "besoins" && (
        entreprise.demandes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun besoin"
            description="Aucune demande de formation enregistrée."
            actionLabel="Nouvelle demande"
            actionHref={`/demandes/nouveau?entrepriseId=${entreprise.id}`}
          />
        ) : (
          <DataTable headers={["Titre", "Statut", "Priorité", "Stagiaires", "Créé le", ""]}>
            {entreprise.demandes.map((d) => (
              <tr key={d.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <Link href={`/prospects/${d.id}`} className="text-red-500 hover:underline font-medium">
                    {d.titre}
                  </Link>
                </td>
                <td className="px-4 py-3">{statutBadge(BESOIN_STATUTS, d.statut)}</td>
                <td className="px-4 py-3 text-gray-400 capitalize">
                  {BESOIN_PRIORITES[d.priorite as keyof typeof BESOIN_PRIORITES]?.label ?? d.priorite}
                </td>
                <td className="px-4 py-3 text-gray-400">{d.nbStagiaires ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(d.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {d.devisId && (
                    <Link href={`/commercial/devis/${d.devisId}`} className="text-xs text-red-500 hover:underline inline-flex items-center gap-1">
                      Devis <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )
      )}

      {/* TAB: Devis */}
      {activeTab === "devis" && (
        entreprise.devis.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun devis" description="Aucun devis émis pour cette entreprise." />
        ) : (
          <DataTable headers={["Numéro", "Objet", "Montant TTC", "Statut", "Émis le"]}>
            {entreprise.devis.map((d) => (
              <tr key={d.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <Link href={`/commercial/devis/${d.id}`} className="text-red-500 hover:underline font-mono text-xs">
                    {d.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-300">{d.objet}</td>
                <td className="px-4 py-3 text-gray-200">{formatCurrency(d.montantTTC)}</td>
                <td className="px-4 py-3">{statutBadge(DEVIS_STATUTS, d.statut)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(d.dateEmission)}</td>
              </tr>
            ))}
          </DataTable>
        )
      )}

      {/* TAB: Factures */}
      {activeTab === "factures" && (
        entreprise.factures.length === 0 ? (
          <EmptyState icon={Receipt} title="Aucune facture" description="Aucune facture émise pour cette entreprise." />
        ) : (
          <DataTable headers={["Numéro", "Montant TTC", "Statut", "Émise le", "Échéance"]}>
            {entreprise.factures.map((f) => (
              <tr key={f.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <Link href={`/commercial/factures/${f.id}`} className="text-red-500 hover:underline font-mono text-xs">
                    {f.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-200">{formatCurrency(f.montantTTC)}</td>
                <td className="px-4 py-3">{statutBadge(FACTURE_STATUTS, f.statut)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(f.dateEmission)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(f.dateEcheance)}</td>
              </tr>
            ))}
          </DataTable>
        )
      )}

      {/* TAB: Historique */}
      {activeTab === "historique" && (
        historique === null ? (
          <div className="text-gray-400 text-sm">Chargement…</div>
        ) : historique.length === 0 ? (
          <EmptyState icon={Clock} title="Aucun historique" description="Aucune action enregistrée pour cette entreprise." />
        ) : (
          <div className="space-y-2">
            {historique.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-md border border-gray-700 bg-gray-800 px-4 py-3">
                <Clock className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-200">{h.label}</p>
                  {h.detail && <p className="text-xs text-gray-400 mt-0.5">{h.detail}</p>}
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(h.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, mono,
}: { icon: typeof Mail; label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-400 flex items-center gap-2 shrink-0">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className={`text-gray-200 text-right truncate ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 border-b border-gray-700">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-4 py-3 font-medium text-gray-400 ${i === headers.length - 1 && h === "" ? "text-right" : "text-left"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
