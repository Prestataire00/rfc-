"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, ArrowLeft, Pencil, Trash2, Users, Phone, Mail, Car, Bus,
  Accessibility, DoorOpen, Calendar, Wrench, Euro,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useApi, useApiMutation } from "@/hooks/useApi";

interface LieuFormation {
  id: string;
  nom: string;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  pays: string;
  capacite: number | null;
  equipements: string | null;
  tarifJournee: number | null;
  tarifDemiJournee: number | null;
  contactNom: string | null;
  contactTelephone: string | null;
  contactEmail: string | null;
  accessibilitePMR: boolean;
  consignesAcces: string | null;
  infoParking: string | null;
  infoTransport: string | null;
  notes: string | null;
  actif: boolean;
  sessions: {
    id: string;
    dateDebut: string;
    dateFin: string;
    statut: string;
    formation: { id: string; titre: string };
    formateur: { id: string; nom: string; prenom: string } | null;
    _count: { inscriptions: number };
  }[];
}

export default function LieuDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: lieu, error, isLoading: loading } = useApi<LieuFormation>(`/api/lieux-formation/${id}`);
  const { trigger: deleteLieu, isMutating: deleting } = useApiMutation(`/api/lieux-formation/${id}`, "DELETE");

  const handleDelete = async () => {
    try {
      await deleteLieu();
      router.push("/lieux-formation");
    } catch { setDeleteOpen(false); }
  };

  if (loading) return <div className="p-6 flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;
  if (error || !lieu) return <div className="p-6"><p className="text-red-600">{error?.message || "Lieu introuvable"}</p><Link href="/lieux-formation" className="text-red-600 hover:underline text-sm mt-2 inline-block">Retour</Link></div>;

  const adresseFull = [lieu.adresse, lieu.codePostal, lieu.ville].filter(Boolean).join(", ");

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/lieux-formation" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux lieux
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-900/30 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">{lieu.nom}</h1>
              <div className="flex items-center gap-2 mt-1">
                {adresseFull && <span className="text-sm text-gray-400">{adresseFull}</span>}
                {lieu.accessibilitePMR && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-700 px-2.5 py-0.5 text-xs font-medium">
                    <Accessibility className="h-3 w-3" /> PMR
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/lieux-formation/${id}/modifier`} className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Carte Map */}
      {adresseFull && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> Localisation</CardTitle>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseFull)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-500 hover:underline"
              >
                Ouvrir dans Google Maps
              </a>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-lg">
            <iframe
              title="Carte du lieu"
              width="100%"
              height="300"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(adresseFull)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Caracteristiques</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lieu.capacite && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-300">Capacité : {lieu.capacite} personnes</span>
              </div>
            )}
            {lieu.tarifJournee && (
              <div className="flex items-center gap-3">
                <Euro className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-300">Tarif journée : {formatCurrency(lieu.tarifJournee)}</span>
              </div>
            )}
            {lieu.tarifDemiJournee && (
              <div className="flex items-center gap-3">
                <Euro className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-300">Tarif demi-journée : {formatCurrency(lieu.tarifDemiJournee)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {(lieu.contactNom || lieu.contactTelephone || lieu.contactEmail) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lieu.contactNom && <p className="text-sm text-gray-300">{lieu.contactNom}</p>}
              {lieu.contactTelephone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300">{lieu.contactTelephone}</span>
                </div>
              )}
              {lieu.contactEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300">{lieu.contactEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {lieu.equipements && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-gray-400" /> Équipements</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-gray-300 whitespace-pre-wrap">{lieu.equipements}</p></CardContent>
          </Card>
        )}

        {(lieu.consignesAcces || lieu.infoParking || lieu.infoTransport) && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><DoorOpen className="h-4 w-4 text-gray-400" /> Accès</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lieu.consignesAcces && <p className="text-sm text-gray-300 whitespace-pre-wrap">{lieu.consignesAcces}</p>}
              {lieu.infoParking && (
                <div className="flex items-start gap-2">
                  <Car className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{lieu.infoParking}</p>
                </div>
              )}
              {lieu.infoTransport && (
                <div className="flex items-start gap-2">
                  <Bus className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{lieu.infoTransport}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {lieu.notes && (
          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-gray-300 whitespace-pre-wrap">{lieu.notes}</p></CardContent>
          </Card>
        )}
      </div>

      {/* Sessions liées */}
      <h2 className="text-lg font-semibold text-gray-100 mt-8 mb-4">Sessions dans ce lieu ({lieu.sessions.length})</h2>
      {lieu.sessions.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucune session planifiée dans ce lieu</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Formation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Formateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Inscrits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lieu.sessions.map((s) => {
                const si = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
                return (
                  <tr key={s.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <Link href={`/formations/${s.formation.id}`} className="text-red-600 hover:underline">{s.formation.titre}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <Link href={`/sessions/${s.id}`} className="text-red-600 hover:underline">{formatDate(s.dateDebut)} → {formatDate(s.dateFin)}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{s._count.inscriptions}</td>
                    <td className="px-6 py-4">{si && <StatutBadge label={si.label} color={si.color} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Supprimer le lieu" description={`Supprimer "${lieu.nom}" ? Cette action est irréversible.`} confirmLabel="Supprimer" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
