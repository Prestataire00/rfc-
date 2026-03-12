"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle, FileText } from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { FACTURE_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

type LigneDevis = {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
};

type Facture = {
  id: string;
  numero: string;
  statut: string;
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  dateEmission: string;
  dateEcheance: string;
  datePaiement: string | null;
  notes: string | null;
  entreprise: { id: string; nom: string } | null;
  devis: {
    id: string;
    numero: string;
    objet: string;
    lignes: LigneDevis[];
  } | null;
};

export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const fetchFacture = useCallback(async () => {
    const res = await fetch(`/api/factures/${id}`);
    if (res.ok) setFacture(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchFacture();
  }, [fetchFacture]);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/factures/${id}`, { method: "DELETE" });
    router.push("/commercial");
  };

  const handleStatutChange = async (newStatut: string) => {
    setUpdatingStatut(true);
    const res = await fetch(`/api/factures/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatut }),
    });
    if (res.ok) await fetchFacture();
    setUpdatingStatut(false);
  };

  const handleMarkAsPaid = async () => {
    setMarkingPaid(true);
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/factures/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "payee", datePaiement: today }),
    });
    if (res.ok) await fetchFacture();
    setMarkingPaid(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Facture non trouvée</p>
        <Link href="/commercial" className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
      </div>
    );
  }

  const st = FACTURE_STATUTS[facture.statut as keyof typeof FACTURE_STATUTS];
  const montantTVA = facture.montantHT * (facture.tauxTVA / 100);
  const isPaid = facture.statut === "payee";
  const nextStatuts = Object.keys(FACTURE_STATUTS).filter((k) => k !== facture.statut);
  const isOverdue =
    !isPaid &&
    facture.statut !== "annulee" &&
    new Date(facture.dateEcheance) < new Date();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/commercial"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-gray-500">{facture.numero}</span>
              {st && <StatutBadge label={st.label} color={st.color} />}
              {isOverdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                  En retard
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(facture.montantTTC)}
            </h1>
            {facture.entreprise && (
              <p className="text-gray-500">
                <Link href={`/entreprises/${facture.entreprise.id}`} className="text-blue-600 hover:underline">
                  {facture.entreprise.nom}
                </Link>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Info + Actions */}
        <div className="col-span-1 space-y-4">
          {/* Info */}
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Informations</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Date d'émission</p>
                <p className="font-medium">{formatDate(facture.dateEmission)}</p>
              </div>
              <div>
                <p className="text-gray-500">Date d'échéance</p>
                <p className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {formatDate(facture.dateEcheance)}
                  {isOverdue && " (dépassée)"}
                </p>
              </div>
              {facture.datePaiement && (
                <div>
                  <p className="text-gray-500">Date de paiement</p>
                  <p className="font-medium text-green-600">{formatDate(facture.datePaiement)}</p>
                </div>
              )}
              {facture.entreprise && (
                <div>
                  <p className="text-gray-500">Entreprise</p>
                  <Link href={`/entreprises/${facture.entreprise.id}`} className="font-medium text-blue-600 hover:underline">
                    {facture.entreprise.nom}
                  </Link>
                </div>
              )}
              {facture.devis && (
                <div>
                  <p className="text-gray-500">Devis associé</p>
                  <Link href={`/commercial/devis/${facture.devis.id}`} className="font-medium text-blue-600 hover:underline">
                    {facture.devis.numero}
                  </Link>
                  {facture.devis.objet && (
                    <p className="text-gray-400 text-xs">{facture.devis.objet}</p>
                  )}
                </div>
              )}
              {facture.notes && (
                <div>
                  <p className="text-gray-500">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{facture.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Marquer comme payée */}
          {!isPaid && facture.statut !== "annulee" && (
            <div className="rounded-lg border bg-white p-4">
              <Button
                onClick={handleMarkAsPaid}
                disabled={markingPaid}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {markingPaid ? "Mise à jour..." : "Marquer comme payée"}
              </Button>
            </div>
          )}

          {/* Changer le statut */}
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Changer le statut</h2>
            <div className="space-y-2">
              {nextStatuts.map((key) => {
                const s = FACTURE_STATUTS[key as keyof typeof FACTURE_STATUTS];
                return (
                  <button
                    key={key}
                    onClick={() => handleStatutChange(key)}
                    disabled={updatingStatut}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium border transition-colors hover:opacity-80 disabled:opacity-50 ${s.color}`}
                  >
                    Marquer comme {s.label.toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Lignes / Détail */}
        <div className="col-span-2">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Détail de la facture</h2>
            </div>

            {facture.devis && facture.devis.lignes && facture.devis.lignes.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Désignation</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Qté</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Prix unitaire HT</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facture.devis.lignes.map((ligne) => (
                      <tr key={ligne.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-gray-800">{ligne.designation}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{ligne.quantite}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(ligne.prixUnitaire)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {formatCurrency(ligne.montant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucun détail de lignes disponible</p>
              </div>
            )}

            {/* Totaux */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8">
                  <span className="text-gray-600">Montant HT</span>
                  <span className="font-medium text-gray-800 w-32 text-right">
                    {formatCurrency(facture.montantHT)}
                  </span>
                </div>
                <div className="flex gap-8">
                  <span className="text-gray-600">TVA ({facture.tauxTVA}%)</span>
                  <span className="font-medium text-gray-800 w-32 text-right">
                    {formatCurrency(montantTVA)}
                  </span>
                </div>
                <div className="flex gap-8 pt-1 border-t border-gray-200 mt-1">
                  <span className="font-semibold text-gray-900">Montant TTC</span>
                  <span className="font-bold text-lg text-gray-900 w-32 text-right">
                    {formatCurrency(facture.montantTTC)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la facture ?"
        description="Cette action est irréversible. La facture sera définitivement supprimée."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
