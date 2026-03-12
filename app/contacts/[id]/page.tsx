"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { User, Building2, Mail, Phone, Briefcase, FileText, Calendar, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_TYPES, INSCRIPTION_STATUTS, SESSION_STATUTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface Session {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: keyof typeof SESSION_STATUTS;
  lieu: string | null;
  formation: {
    id: string;
    titre: string;
  };
}

interface Inscription {
  id: string;
  statut: keyof typeof INSCRIPTION_STATUTS;
  createdAt: string;
  session: Session;
}

interface Entreprise {
  id: string;
  nom: string;
}

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  type: keyof typeof CONTACT_TYPES;
  poste: string | null;
  notes: string | null;
  entreprise: Entreprise | null;
  inscriptions: Inscription[];
  createdAt: string;
}

type TabKey = "informations" | "historique";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("informations");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Contact introuvable");
        return res.json();
      })
      .then((data) => setContact(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      router.push("/contacts");
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

  if (error || !contact) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Contact introuvable"}</p>
        <Link href="/contacts" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Retour aux contacts
        </Link>
      </div>
    );
  }

  const typeInfo = CONTACT_TYPES[contact.type];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux contacts
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {contact.prenom} {contact.nom}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {typeInfo && <StatutBadge label={typeInfo.label} color={typeInfo.color} />}
                {contact.poste && (
                  <span className="text-sm text-gray-500">{contact.poste}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/contacts/${id}/modifier`}
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
        <nav className="flex gap-6">
          {(["informations", "historique"] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "informations" ? "Informations" : `Historique (${contact.inscriptions.length})`}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "informations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`tel:${contact.telephone}`} className="text-sm text-gray-700 hover:underline">
                    {contact.telephone}
                  </a>
                </div>
              )}
              {contact.poste && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{contact.poste}</span>
                </div>
              )}
              {contact.entreprise && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                  <Link
                    href={`/entreprises/${contact.entreprise.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {contact.entreprise.nom}
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-500">
                  Créé le {formatDate(contact.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "historique" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {contact.inscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Aucune inscription enregistrée</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Formation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut inscription
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contact.inscriptions.map((inscription) => {
                  const sessionStatut = SESSION_STATUTS[inscription.session.statut];
                  const inscriptionStatut = INSCRIPTION_STATUTS[inscription.statut];
                  return (
                    <tr key={inscription.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/formations/${inscription.session.formation.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {inscription.session.formation.titre}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(inscription.session.dateDebut)}
                        {" → "}
                        {formatDate(inscription.session.dateFin)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sessionStatut && (
                          <StatutBadge label={sessionStatut.label} color={sessionStatut.color} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inscriptionStatut && (
                          <StatutBadge label={inscriptionStatut.label} color={inscriptionStatut.color} />
                        )}
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
        title="Supprimer le contact"
        description={`Êtes-vous sûr de vouloir supprimer ${contact.prenom} ${contact.nom} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
