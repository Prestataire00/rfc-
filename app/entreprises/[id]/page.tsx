"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Hash,
  Users,
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_TYPES, DEVIS_STATUTS, FACTURE_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  type: keyof typeof CONTACT_TYPES;
  poste: string | null;
}

interface Devis {
  id: string;
  numero: string;
  statut: keyof typeof DEVIS_STATUTS;
  montantHT: number;
  createdAt: string;
}

interface Facture {
  id: string;
  numero: string;
  statut: keyof typeof FACTURE_STATUTS;
  montantTTC: number;
  dateEcheance: string | null;
  createdAt: string;
}

interface Entreprise {
  id: string;
  nom: string;
  secteur: string | null;
  adresse: string | null;
  ville: string | null;
  codePostal: string | null;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  site: string | null;
  notes: string | null;
  contacts: Contact[];
  devis: Devis[];
  factures: Facture[];
  createdAt: string;
}

type TabKey = "informations" | "contacts" | "devis" | "factures";

export default function EntrepriseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("informations");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/entreprises/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Entreprise introuvable");
        return res.json();
      })
      .then((data) => setEntreprise(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/entreprises/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      router.push("/entreprises");
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !entreprise) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Entreprise introuvable"}</p>
        <Link href="/entreprises" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Retour aux entreprises
        </Link>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "informations", label: "Informations" },
    { key: "contacts", label: `Contacts (${entreprise.contacts.length})` },
    { key: "devis", label: `Devis (${entreprise.devis.length})` },
    { key: "factures", label: `Factures (${entreprise.factures.length})` },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/entreprises"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{entreprise.nom}</h1>
              {entreprise.secteur && (
                <p className="text-sm text-gray-500 mt-0.5">{entreprise.secteur}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/entreprises/${id}/modifier`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Informations */}
      {activeTab === "informations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(entreprise.adresse || entreprise.ville) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    {entreprise.adresse && <p>{entreprise.adresse}</p>}
                    {(entreprise.codePostal || entreprise.ville) && (
                      <p>
                        {entreprise.codePostal} {entreprise.ville}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {entreprise.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`mailto:${entreprise.email}`} className="text-sm text-blue-600 hover:underline">
                    {entreprise.email}
                  </a>
                </div>
              )}
              {entreprise.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`tel:${entreprise.telephone}`} className="text-sm text-gray-700 hover:underline">
                    {entreprise.telephone}
                  </a>
                </div>
              )}
              {entreprise.site && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                  <a
                    href={entreprise.site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {entreprise.site}
                  </a>
                </div>
              )}
              {entreprise.siret && (
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 font-mono">SIRET: {entreprise.siret}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-500">
                  Créée le {formatDate(entreprise.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{entreprise.contacts.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Contact{entreprise.contacts.length !== 1 ? "s" : ""}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{entreprise.devis.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Devis</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{entreprise.factures.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Facture{entreprise.factures.length !== 1 ? "s" : ""}</div>
                </CardContent>
              </Card>
            </div>

            {entreprise.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{entreprise.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Contacts */}
      {activeTab === "contacts" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {entreprise.contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Aucun contact associé</p>
              <Link
                href={`/contacts/nouveau`}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Ajouter un contact
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poste</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entreprise.contacts.map((contact) => {
                  const typeInfo = CONTACT_TYPES[contact.type];
                  return (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {contact.prenom} {contact.nom}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contact.email || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contact.poste || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {typeInfo && <StatutBadge label={typeInfo.label} color={typeInfo.color} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Devis */}
      {activeTab === "devis" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {entreprise.devis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-gray-500">Aucun devis enregistré</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant HT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entreprise.devis.map((devis) => {
                  const statutInfo = DEVIS_STATUTS[devis.statut];
                  return (
                    <tr key={devis.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        {devis.numero}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(devis.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(devis.montantHT)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statutInfo && <StatutBadge label={statutInfo.label} color={statutInfo.color} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Factures */}
      {activeTab === "factures" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {entreprise.factures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-gray-500">Aucune facture enregistrée</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entreprise.factures.map((facture) => {
                  const statutInfo = FACTURE_STATUTS[facture.statut];
                  return (
                    <tr key={facture.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        {facture.numero}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(facture.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {facture.dateEcheance ? formatDate(facture.dateEcheance) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(facture.montantTTC)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statutInfo && <StatutBadge label={statutInfo.label} color={statutInfo.color} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer l'entreprise"
        description={`Êtes-vous sûr de vouloir supprimer ${entreprise.nom} ? Cette action est irréversible et supprimera toutes les données associées.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
