"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Loader2, Plus, Star, UserCheck, Phone, Mail,
  MessageSquare, Calendar, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";
import { formatDatetime } from "@/lib/utils";

interface Activity {
  id: string;
  type: string;
  titre: string;
  description: string | null;
  date: string;
  userId: string | null;
}

interface Prospect {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  entreprise: string | null;
  source: string | null;
  statut: string;
  score: number | null;
  notes: string | null;
  attribueA: string | null;
  dateProchaineAction: string | null;
  contactId: string | null;
  activities: Activity[];
}

interface User {
  id: string;
  nom: string;
  prenom: string;
}

const STATUTS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "qualifie", label: "Qualifie" },
  { value: "proposition", label: "Proposition" },
  { value: "gagne", label: "Gagne" },
  { value: "perdu", label: "Perdu" },
];

const ACTIVITY_TYPES = [
  { value: "call", label: "Appel", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Reunion", icon: Calendar },
  { value: "note", label: "Note", icon: FileText },
];

function activityIcon(type: string) {
  const t = ACTIVITY_TYPES.find((x) => x.value === type);
  return t?.icon ?? MessageSquare;
}

export default function ProspectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const { data: prospect, isLoading, mutate } = useApi<Prospect>(id ? `/api/prospects/${id}` : null);
  const { data: users } = useApi<User[]>("/api/utilisateurs");

  const [form, setForm] = useState({
    statut: "nouveau",
    score: 50,
    attribueA: "",
    dateProchaineAction: "",
    notes: "",
    source: "",
  });

  useEffect(() => {
    if (prospect) {
      setForm({
        statut: prospect.statut,
        score: prospect.score ?? 50,
        attribueA: prospect.attribueA ?? "",
        dateProchaineAction: prospect.dateProchaineAction
          ? new Date(prospect.dateProchaineAction).toISOString().split("T")[0]
          : "",
        notes: prospect.notes ?? "",
        source: prospect.source ?? "",
      });
    }
  }, [prospect]);

  const { trigger: updateProspect, isMutating: saving } = useApiMutation<Record<string, unknown>>(
    `/api/prospects/${id}`,
    "PUT"
  );
  const { trigger: addActivity, isMutating: addingActivity } = useApiMutation<Record<string, unknown>>(
    `/api/prospects/${id}/activities`,
    "POST"
  );
  const { trigger: convertir, isMutating: converting } = useApiMutation<Record<string, unknown>, { contact: { id: string } }>(
    `/api/prospects/${id}/convertir`,
    "POST"
  );

  const [actModalOpen, setActModalOpen] = useState(false);
  const [actForm, setActForm] = useState({
    type: "call",
    titre: "",
    description: "",
    date: new Date().toISOString().slice(0, 16),
  });
  const [confirmConvert, setConfirmConvert] = useState(false);

  const handleSave = async () => {
    if (!prospect) return;
    try {
      const payload: Record<string, unknown> = {
        prenom: prospect.prenom,
        nom: prospect.nom,
        statut: form.statut,
        score: form.score,
        attribueA: form.attribueA || null,
        dateProchaineAction: form.dateProchaineAction || null,
        notes: form.notes || null,
        source: form.source || null,
      };
      await updateProspect(payload);
      notify.success("Prospect mis a jour");
      await mutate();
      await invalidate("/api/prospects");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const handleAddActivity = async () => {
    if (!actForm.titre.trim()) {
      notify.error("Le titre est requis");
      return;
    }
    try {
      await addActivity({
        type: actForm.type,
        titre: actForm.titre.trim(),
        description: actForm.description.trim() || null,
        date: new Date(actForm.date).toISOString(),
      });
      notify.success("Activite ajoutee");
      setActForm({
        type: "call",
        titre: "",
        description: "",
        date: new Date().toISOString().slice(0, 16),
      });
      setActModalOpen(false);
      await mutate();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const handleConvert = async () => {
    try {
      const result = await convertir({ type: "client" });
      notify.success("Prospect converti en client");
      await invalidate("/api/prospects", "/api/contacts");
      router.push(`/contacts/${result.contact.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Conversion impossible", msg);
    }
  };

  if (isLoading || !prospect) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const userOptions = [
    { value: "", label: "Non attribue" },
    ...((users ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))),
  ];

  return (
    <div>
      <Link
        href="/prospects"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux prospects
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {prospect.prenom} {prospect.nom}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3 flex-wrap">
            {prospect.entreprise && <span>{prospect.entreprise}</span>}
            {prospect.email && <a href={`mailto:${prospect.email}`} className="hover:text-red-400 flex items-center gap-1"><Mail className="h-3 w-3" /> {prospect.email}</a>}
            {prospect.telephone && <a href={`tel:${prospect.telephone}`} className="hover:text-red-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {prospect.telephone}</a>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base text-gray-900 dark:text-gray-100">Informations commerciales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  options={STATUTS}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Attribue a</Label>
                <Select
                  value={form.attribueA}
                  onChange={(e) => setForm({ ...form, attribueA: e.target.value })}
                  options={userOptions}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" /> Score : {form.score}
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.score}
                onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                className="w-full accent-red-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prochaine action</Label>
                <Input
                  type="date"
                  value={form.dateProchaineAction}
                  onChange={(e) => setForm({ ...form, dateProchaineAction: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base text-gray-900 dark:text-gray-100">Conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prospect.contactId ? (
              <div className="space-y-2">
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Deja converti en client
                </p>
                <Link
                  href={`/contacts/${prospect.contactId}`}
                  className="block text-sm text-red-400 hover:underline"
                >
                  Voir la fiche contact
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Transformer ce prospect en client cree automatiquement une fiche Contact.
                </p>
                <Button
                  onClick={() => setConfirmConvert(true)}
                  disabled={!prospect.email || converting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <UserCheck className="h-4 w-4" />
                  {converting ? "Conversion..." : "Convertir en client"}
                </Button>
                {!prospect.email && (
                  <p className="text-[11px] text-amber-400">
                    Email obligatoire pour la conversion.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-gray-900 dark:text-gray-100">
            Activites ({prospect.activities.length})
          </CardTitle>
          <Button onClick={() => setActModalOpen(true)} size="sm" className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {prospect.activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              Aucune activite enregistree.
            </p>
          ) : (
            <div className="space-y-3">
              {prospect.activities.map((a) => {
                const Icon = activityIcon(a.type);
                return (
                  <div key={a.id} className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                    <div className="h-8 w-8 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.titre}</p>
                        <span className="text-[11px] text-gray-500 shrink-0">{formatDatetime(a.date)}</span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={actModalOpen} onOpenChange={setActModalOpen}>
        <DialogContent
          onClose={() => setActModalOpen(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Ajouter une activite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={actForm.type}
                onChange={(e) => setActForm({ ...actForm, type: e.target.value })}
                options={ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input
                value={actForm.titre}
                onChange={(e) => setActForm({ ...actForm, titre: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={actForm.description}
                onChange={(e) => setActForm({ ...actForm, description: e.target.value })}
                rows={3}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="datetime-local"
                value={actForm.date}
                onChange={(e) => setActForm({ ...actForm, date: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActModalOpen(false)}>Annuler</Button>
            <Button onClick={handleAddActivity} disabled={addingActivity} className="bg-red-600 hover:bg-red-700">
              {addingActivity ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmConvert}
        onOpenChange={setConfirmConvert}
        title="Convertir en client ?"
        description={`Une fiche Contact sera creee pour ${prospect.prenom} ${prospect.nom}. Le prospect sera marque comme gagne.`}
        confirmLabel="Convertir"
        loading={converting}
        onConfirm={handleConvert}
      />
    </div>
  );
}
