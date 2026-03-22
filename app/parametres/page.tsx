"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Send, CheckCircle, XCircle, Settings, Database, Shield, Building2, Save, FileText } from "lucide-react";

type Parametres = {
  nomEntreprise: string;
  slogan: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siteWeb: string;
  siret: string;
  nda: string;
  tvaIntracom: string;
  conditionsPaiement: string;
  mentionsDevis: string;
  mentionsFacture: string;
};

const defaultParams: Parametres = {
  nomEntreprise: "RFC - Rescue Formation Conseil",
  slogan: "Sécurité - Incendie - Prévention",
  adresse: "",
  codePostal: "",
  ville: "",
  telephone: "",
  email: "",
  siteWeb: "www.rescueformation83.fr",
  siret: "",
  nda: "",
  tvaIntracom: "",
  conditionsPaiement: "Paiement à 30 jours à compter de la date de facturation.",
  mentionsDevis: "Devis valable 30 jours.",
  mentionsFacture: "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.",
};

export default function ParametresPage() {
  const [params, setParams] = useState<Parametres>(defaultParams);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean; host?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch("/api/parametres/entreprise")
      .then((r) => (r.ok ? r.json() : defaultParams))
      .then((data) => setParams({ ...defaultParams, ...data }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/parametres/entreprise", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const updateField = (field: keyof Parametres, value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  const checkSmtp = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/parametres/smtp-status");
      const data = await res.json();
      setSmtpStatus(data);
    } catch {
      setSmtpStatus({ configured: false });
    }
    setChecking(false);
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/parametres/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Erreur de connexion" });
    }
    setTesting(false);
  };

  return (
    <div>
      <PageHeader title="Paramètres" description="Configuration de la plateforme" />

      <div className="space-y-6">
        {/* Informations entreprise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-red-600" />
              Informations de l'entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              Ces informations apparaîtront sur tous les documents générés (devis, factures, conventions, attestations, etc.)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom de l'entreprise</Label>
                <Input value={params.nomEntreprise} onChange={(e) => updateField("nomEntreprise", e.target.value)} />
              </div>
              <div>
                <Label>Slogan / Activité</Label>
                <Input value={params.slogan} onChange={(e) => updateField("slogan", e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Adresse</Label>
              <Input value={params.adresse} onChange={(e) => updateField("adresse", e.target.value)} placeholder="123 rue de la Formation" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Code postal</Label>
                <Input value={params.codePostal} onChange={(e) => updateField("codePostal", e.target.value)} placeholder="83000" />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={params.ville} onChange={(e) => updateField("ville", e.target.value)} placeholder="Toulon" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Téléphone</Label>
                <Input value={params.telephone} onChange={(e) => updateField("telephone", e.target.value)} placeholder="04 94 XX XX XX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={params.email} onChange={(e) => updateField("email", e.target.value)} placeholder="contact@rescueformation83.fr" />
              </div>
            </div>

            <div>
              <Label>Site web</Label>
              <Input value={params.siteWeb} onChange={(e) => updateField("siteWeb", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>SIRET</Label>
                <Input value={params.siret} onChange={(e) => updateField("siret", e.target.value)} placeholder="XXX XXX XXX XXXXX" />
              </div>
              <div>
                <Label>N° Déclaration d'Activité (NDA)</Label>
                <Input value={params.nda} onChange={(e) => updateField("nda", e.target.value)} placeholder="XX XX XXXXX XX" />
              </div>
              <div>
                <Label>TVA Intracommunautaire</Label>
                <Input value={params.tvaIntracom} onChange={(e) => updateField("tvaIntracom", e.target.value)} placeholder="FR XX XXXXXXXXX" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-500">
                  <CheckCircle className="h-4 w-4" /> Enregistré
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mentions documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              Mentions sur les documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Conditions de paiement</Label>
              <Textarea value={params.conditionsPaiement} onChange={(e) => updateField("conditionsPaiement", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Mentions sur les devis</Label>
              <Textarea value={params.mentionsDevis} onChange={(e) => updateField("mentionsDevis", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Mentions sur les factures</Label>
              <Textarea value={params.mentionsFacture} onChange={(e) => updateField("mentionsFacture", e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SMTP */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-red-600" />
                Configuration SMTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Configurez les variables SMTP dans <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">.env</code>
              </p>
              <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm font-mono">
                <div><span className="text-gray-400">SMTP_HOST=</span><span className="text-red-600">smtp.gmail.com</span></div>
                <div><span className="text-gray-400">SMTP_PORT=</span><span className="text-red-600">587</span></div>
                <div><span className="text-gray-400">SMTP_USER=</span><span className="text-red-600">votre-email</span></div>
                <div><span className="text-gray-400">SMTP_PASS=</span><span className="text-red-600">mot-de-passe-app</span></div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={checkSmtp} disabled={checking}>
                    <Settings className="h-4 w-4 mr-1" />
                    {checking ? "Vérification..." : "Vérifier SMTP"}
                  </Button>
                  {smtpStatus && (
                    <span className={`text-sm flex items-center gap-1 ${smtpStatus.configured ? "text-green-500" : "text-red-500"}`}>
                      {smtpStatus.configured ? <><CheckCircle className="h-4 w-4" /> Configuré</> : <><XCircle className="h-4 w-4" /> Non configuré</>}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Email de test</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="email" placeholder="test@exemple.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="flex-1" />
                  <Button onClick={sendTestEmail} disabled={testing || !testEmail}>
                    <Send className="h-4 w-4 mr-1" />
                    {testing ? "Envoi..." : "Tester"}
                  </Button>
                </div>
                {testResult && (
                  <span className={`mt-2 text-sm flex items-center gap-1 ${testResult.success ? "text-green-500" : "text-red-500"}`}>
                    {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {testResult.message}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Infos système */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  Base de données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fournisseur</span>
                  <span className="font-medium">Supabase (PostgreSQL)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Statut</span>
                  <span className="text-green-500 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Connecté
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  Authentification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Provider</span>
                  <span className="font-medium">NextAuth v4</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Rôles</span>
                  <span className="font-medium">Admin, Formateur, Client</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
