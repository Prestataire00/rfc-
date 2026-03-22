"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Send, CheckCircle, XCircle, Settings, Database, Shield } from "lucide-react";

export default function ParamètresPage() {
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean; host?: string } | null>(null);
  const [checking, setChecking] = useState(false);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMTP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-600" />
              Configuration SMTP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              Pour envoyer des emails (convocations, évaluations, devis), configurez les variables SMTP dans le fichier <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">.env</code>
            </p>
            <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm font-mono">
              <div><span className="text-gray-400">SMTP_HOST=</span><span className="text-red-600">smtp.gmail.com</span></div>
              <div><span className="text-gray-400">SMTP_PORT=</span><span className="text-red-600">587</span></div>
              <div><span className="text-gray-400">SMTP_USER=</span><span className="text-red-600">votre-email@gmail.com</span></div>
              <div><span className="text-gray-400">SMTP_PASS=</span><span className="text-red-600">votre-mot-de-passe-app</span></div>
              <div><span className="text-gray-400">SMTP_FROM=</span><span className="text-red-600">RFC &lt;noreply@rfc-formation.fr&gt;</span></div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Statut SMTP</h4>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={checkSmtp} disabled={checking}>
                  <Settings className="h-4 w-4 mr-1" />
                  {checking ? "Vérification..." : "Vérifier"}
                </Button>
                {smtpStatus && (
                  <div className="flex items-center gap-1.5 text-sm">
                    {smtpStatus.configured ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Configuré ({smtpStatus.host})</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">Non configuré</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Envoyer un email de test</h4>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={sendTestEmail} disabled={testing || !testEmail}>
                  <Send className="h-4 w-4 mr-1" />
                  {testing ? "Envoi..." : "Tester"}
                </Button>
              </div>
              {testResult && (
                <div className={`mt-2 flex items-center gap-1.5 text-sm ${testResult.success ? "text-green-600" : "text-red-500"}`}>
                  {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResult.message}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Guide rapide - Gmail</h4>
              <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>Activez la vérification en 2 étapes sur votre compte Google</li>
                <li>Allez dans Sécurité &gt; Mots de passe des applications</li>
                <li>Créez un mot de passe pour &quot;Autre (RFC)&quot;</li>
                <li>Utilisez ce mot de passe comme <code className="bg-gray-700 px-1 rounded text-xs">SMTP_PASS</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Platform Info */}
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
                <span className="text-gray-400">ORM</span>
                <span className="font-medium">Prisma</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Statut</span>
                <span className="text-green-600 font-medium flex items-center gap-1">
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
                <span className="font-medium">NextAuth v4 (Credentials)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Stratégie</span>
                <span className="font-medium">JWT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rôles</span>
                <span className="font-medium">Admin, Formateur, Client</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-400" />
                Application
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Framework</span>
                <span className="font-medium">Next.js 14</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Langage</span>
                <span className="font-medium">TypeScript</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Styles</span>
                <span className="font-medium">Tailwind CSS</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
