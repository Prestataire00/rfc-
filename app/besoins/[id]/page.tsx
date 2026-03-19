"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { BESOIN_STATUTS, BESOIN_PRIORITES, BESOIN_ORIGINES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type Besoin = {
  id: string;
  titre: string;
  description: string | null;
  origine: string;
  statut: string;
  priorite: string;
  nbStagiaires: number | null;
  datesSouhaitees: string | null;
  budget: number | null;
  notes: string | null;
  createdAt: string;
  entreprise: any;
  formation: any;
  devis: any;
};

export default function BesoinDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [besoin, setBesoin] = useState<Besoin | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/besoins/${id}`).then((r) => r.ok ? r.json() : null).then((d) => {
      setBesoin(d);
      setLoading(false);
    });
  }, [id]);

  async function updateStatut(statut: string) {
    if (!besoin) return;
    await fetch(`/api/besoins/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...besoin, statut }),
    });
    setBesoin({ ...besoin, statut });
  }

  async function handleDelete() {
    await fetch(`/api/besoins/${id}`, { method: "DELETE" });
    router.push("/besoins");
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  if (!besoin) return <p>Besoin non trouvé</p>;

  const st = BESOIN_STATUTS[besoin.statut as keyof typeof BESOIN_STATUTS];
  const prio = BESOIN_PRIORITES[besoin.priorite as keyof typeof BESOIN_PRIORITES];

  return (
    <div>
      <Link href="/besoins" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour aux besoins
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{besoin.titre}</h1>
          <div className="flex items-center gap-3 mt-2">
            {st && <StatutBadge label={st.label} color={st.color} />}
            <span className={`text-sm font-medium ${prio?.color}`}>{prio?.label}</span>
            <span className="text-sm text-gray-500">Créé le {formatDate(besoin.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDelete(true)} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {besoin.description && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{besoin.description}</p>
            </div>
          )}

          <div className="rounded-lg border bg-white p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Avancement</h3>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(BESOIN_STATUTS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => updateStatut(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    besoin.statut === key ? val.color + " ring-2 ring-offset-1 ring-blue-400" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {besoin.notes && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{besoin.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-gray-900">Informations</h3>
            <div>
              <span className="text-gray-500">Origine:</span>
              <span className="ml-2 text-gray-900">{BESOIN_ORIGINES[besoin.origine as keyof typeof BESOIN_ORIGINES]?.label || besoin.origine}</span>
            </div>
            {besoin.entreprise && (
              <div>
                <span className="text-gray-500">Entreprise:</span>
                <Link href={`/entreprises/${besoin.entreprise.id}`} className="ml-2 text-blue-600 hover:underline">{besoin.entreprise.nom}</Link>
              </div>
            )}
            {besoin.formation && (
              <div>
                <span className="text-gray-500">Formation:</span>
                <Link href={`/formations/${besoin.formation.id}`} className="ml-2 text-blue-600 hover:underline">{besoin.formation.titre}</Link>
              </div>
            )}
            {besoin.nbStagiaires && (
              <div>
                <span className="text-gray-500">Stagiaires:</span>
                <span className="ml-2 text-gray-900">{besoin.nbStagiaires}</span>
              </div>
            )}
            {besoin.budget && (
              <div>
                <span className="text-gray-500">Budget:</span>
                <span className="ml-2 text-gray-900">{formatCurrency(besoin.budget)}</span>
              </div>
            )}
            {besoin.datesSouhaitees && (
              <div>
                <span className="text-gray-500">Dates:</span>
                <span className="ml-2 text-gray-900">{besoin.datesSouhaitees}</span>
              </div>
            )}
          </div>

          {besoin.devis && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Devis associé</h3>
              <Link href={`/commercial/devis/${besoin.devis.id}`} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                <FileText className="h-4 w-4" /> {besoin.devis.numero}
              </Link>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Supprimer ce besoin ?"
        description="Cette action est irréversible."
        onConfirm={handleDelete}
        onOpenChange={setShowDelete}
      />
    </div>
  );
}
