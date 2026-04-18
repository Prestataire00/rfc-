"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Mail, Send, Clock, CheckCircle2, XCircle, Users, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

type Campaign = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  statut: string;
  objet: string | null;
  dateEnvoi: string | null;
  dateEnvoyee: string | null;
  nbDestinataires: number;
  nbEnvoyes: number;
  nbOuverts: number;
  nbClics: number;
  createdAt: string;
  _count: { recipients: number };
};

const STATUT_STYLES: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  brouillon: { icon: Pencil, color: "text-gray-400", label: "Brouillon" },
  planifiee: { icon: Clock, color: "text-amber-400", label: "Planifiee" },
  envoyee: { icon: CheckCircle2, color: "text-emerald-400", label: "Envoyee" },
  annulee: { icon: XCircle, color: "text-red-400", label: "Annulee" },
};

export default function CampagnesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/campaigns").then((r) => r.ok ? r.json() : []).then((d) => {
      setCampaigns(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Nouvelle campagne", type: "email" }),
    });
    if (res.ok) {
      const c = await res.json();
      window.location.href = `/commercial/campagnes/${c.id}`;
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette campagne ?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader title="Campagnes Marketing" description="Emails cibles pour reactiver vos clients et stagiaires" />

      <div className="flex justify-end mb-6">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nouvelle campagne
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-600 bg-gray-800/50 p-12 text-center">
          <Mail className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">Aucune campagne</p>
          <p className="text-sm text-gray-500">Creez votre premiere campagne pour reactiver vos contacts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const style = STATUT_STYLES[c.statut] || STATUT_STYLES.brouillon;
            const Icon = style.icon;
            return (
              <div key={c.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/commercial/campagnes/${c.id}`} className="font-semibold text-gray-100 hover:text-red-400">
                        {c.nom}
                      </Link>
                      <span className={`inline-flex items-center gap-1 text-xs ${style.color}`}>
                        <Icon className="h-3 w-3" /> {style.label}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-gray-400 mb-2">{c.description}</p>}
                    {c.statut === "envoyee" && (
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.nbDestinataires} destinataires</span>
                        <span className="flex items-center gap-1"><Send className="h-3 w-3" /> {c.nbEnvoyes} envoyes</span>
                        {c.dateEnvoyee && <span>le {new Date(c.dateEnvoyee).toLocaleDateString("fr-FR")}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/commercial/campagnes/${c.id}`}
                      className="p-2 rounded-md text-gray-400 hover:bg-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    {c.statut === "brouillon" && (
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-md text-red-400 hover:bg-red-900/30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
