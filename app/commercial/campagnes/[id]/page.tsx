"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Send, Mail, Users, CheckCircle2, Tag, Plus, X } from "lucide-react";

type Campaign = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  statut: string;
  objet: string | null;
  contenu: string | null;
  segmentConfig: string;
  dateEnvoi: string | null;
  nbDestinataires: number;
  nbEnvoyes: number;
  nbOuverts: number;
  nbClics: number;
  recipients: { id: string; contactId: string; statut: string; sentAt: string | null }[];
};

type TagOption = { id: string; nom: string; couleur: string; _count: { contacts: number } };

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  // Form
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [objet, setObjet] = useState("");
  const [contenu, setContenu] = useState("");
  const [segmentTags, setSegmentTags] = useState<string[]>([]);
  const [segmentType, setSegmentType] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/tags").then((r) => r.ok ? r.json() : []),
    ]).then(([c, t]) => {
      if (c) {
        setCampaign(c);
        setNom(c.nom);
        setDescription(c.description || "");
        setObjet(c.objet || "");
        setContenu(c.contenu || "");
        try {
          const seg = JSON.parse(c.segmentConfig);
          setSegmentTags(seg.tags || []);
          setSegmentType(seg.type || "");
        } catch { /* keep defaults */ }
      }
      setTags(Array.isArray(t) ? t : []);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom, description, objet, contenu,
        segmentConfig: { tags: segmentTags, type: segmentType || undefined },
      }),
    });
    if (res.ok) {
      setMsg("Enregistre");
      setTimeout(() => setMsg(""), 2500);
    }
    setSaving(false);
  };

  const handleSend = async () => {
    if (!confirm("Envoyer cette campagne maintenant ? Les emails seront envoyes immediatement.")) return;
    setSending(true);
    const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setMsg(`${data.sent} emails envoyes sur ${data.total}`);
      // Refresh
      const updated = await fetch(`/api/campaigns/${id}`).then((r) => r.json());
      setCampaign(updated);
    } else {
      setMsg("Erreur envoi");
    }
    setSending(false);
  };

  const toggleTag = (tagId: string) => {
    setSegmentTags((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]);
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!campaign) {
    router.push("/commercial/campagnes");
    return null;
  }

  const isSent = campaign.statut === "envoyee";

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/commercial/campagnes" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour campagnes
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Mail className="h-6 w-6 text-red-500" /> {campaign.nom}
        </h1>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-emerald-400"><CheckCircle2 className="h-3 w-3 inline mr-1" />{msg}</span>}
          {!isSent && (
            <>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm text-gray-300 disabled:opacity-50">
                <Save className="h-4 w-4" /> Enregistrer
              </button>
              <button onClick={handleSend} disabled={sending || !objet} className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                <Send className="h-4 w-4" /> {sending ? "Envoi..." : "Envoyer maintenant"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Nom de la campagne</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} disabled={isSent} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Description interne</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSent} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Objet de l&apos;email *</label>
              <input value={objet} onChange={(e) => setObjet(e.target.value)} disabled={isSent} placeholder="ex: Votre recyclage SST arrive a echeance" className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Contenu (HTML)</label>
              <textarea value={contenu} onChange={(e) => setContenu(e.target.value)} disabled={isSent} rows={12} className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-xs text-gray-100 font-mono disabled:opacity-50" placeholder="<p>Bonjour {{stagiaire.prenom}},</p><p>...</p>" />
              <p className="text-[10px] text-gray-500 mt-1">Variables : {"{{stagiaire.prenom}}"}, {"{{stagiaire.nom}}"}. Lien de desinscription ajoute automatiquement.</p>
            </div>
          </div>

          {/* Stats si envoyee */}
          {isSent && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
              <h3 className="font-semibold text-gray-100 mb-3">Resultats</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-100">{campaign.nbDestinataires}</p>
                  <p className="text-xs text-gray-400">Destinataires</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{campaign.nbEnvoyes}</p>
                  <p className="text-xs text-gray-400">Envoyes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{campaign.nbOuverts}</p>
                  <p className="text-xs text-gray-400">Ouverts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{campaign.nbClics}</p>
                  <p className="text-xs text-gray-400">Clics</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Segment */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <h3 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-red-500" /> Ciblage
            </h3>

            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">Type de contact</label>
              <select value={segmentType} onChange={(e) => setSegmentType(e.target.value)} disabled={isSent} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2 disabled:opacity-50">
                <option value="">Tous</option>
                <option value="stagiaire">Stagiaires</option>
                <option value="client">Clients</option>
                <option value="prospect">Prospects</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags (filtre optionnel)
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {tags.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Aucun tag. Creez-en dans les contacts.</p>
                ) : tags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={segmentTags.includes(t.id)}
                      onChange={() => toggleTag(t.id)}
                      disabled={isSent}
                      className="h-3.5 w-3.5 rounded"
                    />
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.couleur }} />
                    <span className="text-xs text-gray-300 flex-1">{t.nom}</span>
                    <span className="text-[10px] text-gray-500">{t._count.contacts}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
