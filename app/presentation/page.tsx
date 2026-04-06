"use client";

import Image from "next/image";
import { useState } from "react";
import {
  LayoutDashboard, BookOpen, CalendarDays, Users, Building2,
  UserCheck, FileText, Star, BarChart3, ShieldCheck, FolderOpen,
  ClipboardList, TrendingUp, Bell, Lock, Smartphone, Download,
  CheckCircle, Zap, ChevronRight, ChevronLeft, Globe, Sparkles,
  Award, LineChart, Mail, QrCode,
} from "lucide-react";

// ── Données de présentation ───────────────────────────────────────────────

const SLIDES = [
  { id: "accueil" },
  { id: "admin" },
  { id: "commercial" },
  { id: "evaluations" },
  { id: "formateur" },
  { id: "client" },
  { id: "public" },
  { id: "ia" },
  { id: "technologie" },
  { id: "conclusion" },
];

const ADMIN_MODULES = [
  { icon: LayoutDashboard, color: "bg-red-500/10 text-red-400", titre: "Tableau de bord", desc: "Vue temps réel : sessions du jour, CA mensuel, taux de remplissage, alertes et notifications." },
  { icon: BookOpen, color: "bg-blue-500/10 text-blue-400", titre: "Catalogue formations", desc: "Gérez vos formations : titre, durée, catégorie, code RNCP, certifiante. Catalogue complet et filtrable." },
  { icon: CalendarDays, color: "bg-purple-500/10 text-purple-400", titre: "Sessions", desc: "Planifiez chaque session : dates, formateur, lieu, places. Feuille de présence PDF et QR code d'inscription automatiques." },
  { icon: Users, color: "bg-green-500/10 text-green-400", titre: "Contacts / Stagiaires", desc: "Annuaire complet avec historique de formations, inscriptions et évaluations par stagiaire." },
  { icon: Building2, color: "bg-amber-500/10 text-amber-400", titre: "Entreprises clientes", desc: "Fiches entreprises avec tous leurs contacts, stagiaires, devis et factures associés." },
  { icon: UserCheck, color: "bg-cyan-500/10 text-cyan-400", titre: "Formateurs", desc: "Gérez vos formateurs : disponibilités, sessions assignées, feedbacks reçus et documents." },
  { icon: ShieldCheck, color: "bg-indigo-500/10 text-indigo-400", titre: "Qualiopi", desc: "Suivi des indicateurs et preuves pour maintenir votre certification Qualiopi à jour." },
  { icon: FolderOpen, color: "bg-pink-500/10 text-pink-400", titre: "Documents", desc: "Stockage centralisé de tous vos documents : conventions, programmes, supports pédagogiques." },
];

const COMMERCIAL_FEATURES = [
  { icon: FileText, titre: "Devis personnalisés", desc: "Créez des devis professionnels avec lignes de détail, TVA et logo RFC. Envoi par email en 1 clic." },
  { icon: TrendingUp, titre: "Conversion en factures", desc: "Transformez un devis accepté en facture en un seul clic. Numérotation automatique." },
  { icon: Download, titre: "Export PDF", desc: "Chaque document (devis, facture, convention, attestation) est exportable en PDF aux couleurs de RFC." },
  { icon: BarChart3, titre: "BPF annuel", desc: "Bilan Pédagogique et Financier automatique : sessions, stagiaires, heures, CA HT/TTC par mois." },
];

const EVAL_FEATURES = [
  { icon: ClipboardList, titre: "Modèles personnalisés", desc: "Construisez vos propres formulaires : notes étoiles, texte libre, oui/non, choix multiples." },
  { icon: QrCode, titre: "Liens uniques", desc: "Chaque stagiaire reçoit un lien unique pour répondre depuis son smartphone, sans connexion." },
  { icon: Star, titre: "Résultats détaillés", desc: "Consultez chaque réponse, note globale, commentaires et statistiques de satisfaction." },
  { icon: Sparkles, titre: "Analyse par IA", desc: "Claude (IA d'Anthropic) analyse automatiquement l'évaluation et génère une synthèse professionnelle modifiable." },
];

const FORMATEUR_FEATURES = [
  "Tableau de bord personnel avec planning du mois",
  "Gestion des disponibilités en ligne",
  "Accès à ses sessions et stagiaires inscrits",
  "Génération des attestations de formation PDF",
  "Consultation des feedbacks et évaluations",
  "Accès aux documents partagés",
];

const CLIENT_FEATURES = [
  "Consultation du catalogue de formations disponibles",
  "Gestion de leurs stagiaires et inscriptions",
  "Accès aux devis et factures en ligne",
  "Téléchargement des conventions et attestations",
  "Suivi des évaluations de leurs formations",
  "Portail sécurisé et dédié à leur entreprise",
];

const TECH_STACK = [
  { label: "Framework", value: "Next.js 14 — App Router", color: "text-blue-400" },
  { label: "Base de données", value: "PostgreSQL (Supabase)", color: "text-green-400" },
  { label: "Authentification", value: "NextAuth v4 — 3 rôles", color: "text-purple-400" },
  { label: "Style", value: "Tailwind CSS — Dark mode", color: "text-cyan-400" },
  { label: "PDF", value: "pdfmake — export natif", color: "text-amber-400" },
  { label: "Intelligence artificielle", value: "Claude (Anthropic)", color: "text-violet-400" },
  { label: "Déploiement", value: "Netlify — CI/CD automatique", color: "text-red-400" },
  { label: "Hébergement BDD", value: "Supabase Cloud — EU", color: "text-emerald-400" },
];

// ── Composants utilitaires ────────────────────────────────────────────────

function Badge({ children, color = "bg-red-600" }: { children: React.ReactNode; color?: string }) {
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${color}`}>{children}</span>;
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl md:text-4xl font-black text-white mb-3">{children}</h2>
      {sub && <p className="text-gray-400 text-lg max-w-2xl mx-auto">{sub}</p>}
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────────────────

function SlideAccueil() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-16">
      <div className="mb-8 relative">
        <div className="absolute inset-0 rounded-full blur-3xl bg-red-600/20 scale-150" />
        <Image src="/logorescue.png" alt="RFC" width={140} height={140} className="relative rounded-2xl shadow-2xl" />
      </div>
      <Badge color="bg-red-600 mb-6">Plateforme de gestion de formation</Badge>
      <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
        RFC <span className="text-red-500">CRM</span>
      </h1>
      <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light">
        Rescue Formation Conseil
      </p>
      <p className="text-gray-400 text-lg max-w-2xl mb-12">
        Solution complète de gestion pour organisme de formation — formations, sessions, stagiaires, facturation, évaluations et bien plus.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl">
        {[
          { n: "3", label: "Espaces utilisateurs" },
          { n: "15+", label: "Modules intégrés" },
          { n: "100%", label: "Exportable PDF" },
          { n: "IA", label: "Analyses automatiques" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5 backdrop-blur">
            <p className="text-3xl font-black text-red-500 mb-1">{s.n}</p>
            <p className="text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideAdmin() {
  return (
    <div className="px-6 py-16 max-w-6xl mx-auto">
      <SectionTitle sub="Un tableau de pilotage complet pour gérer l'ensemble de votre activité de formation.">
        🎛️ Espace Administrateur
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ADMIN_MODULES.map((m) => (
          <div key={m.titre} className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5 hover:border-red-700 transition-colors group">
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 ${m.color}`}>
              <m.icon className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white mb-2 group-hover:text-red-400 transition-colors">{m.titre}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideCommercial() {
  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <SectionTitle sub="Gérez votre activité commerciale et suivez votre chiffre d'affaires en temps réel.">
        💼 Gestion Commerciale & Financière
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {COMMERCIAL_FEATURES.map((f) => (
          <div key={f.titre} className="flex gap-4 rounded-2xl border border-gray-700 bg-gray-800/60 p-6">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <f.icon className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">{f.titre}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-red-800 bg-red-900/10 p-6 text-center">
        <p className="text-red-400 font-semibold text-lg mb-2">BPF — Bilan Pédagogique & Financier</p>
        <p className="text-gray-300">Rapport annuel réglementaire généré automatiquement : nombre de sessions, stagiaires formés, heures dispensées, CA réalisé avec graphiques mensuels.</p>
      </div>
    </div>
  );
}

function SlideEvaluations() {
  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <SectionTitle sub="Créez vos propres formulaires, envoyez-les par lien unique et obtenez une analyse IA instantanée.">
        ⭐ Système d&apos;Évaluations Intelligent
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {EVAL_FEATURES.map((f) => (
          <div key={f.titre} className="flex gap-4 rounded-2xl border border-gray-700 bg-gray-800/60 p-6">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <f.icon className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">{f.titre}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: "📝", label: "Note 1 à 5 étoiles" },
          { icon: "✏️", label: "Réponse texte libre" },
          { icon: "✅", label: "Oui / Non" },
          { icon: "📋", label: "Choix multiple" },
          { icon: "🔗", label: "Lien unique par stagiaire" },
          { icon: "🤖", label: "Synthèse IA modifiable" },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-3 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3">
            <span className="text-xl">{t.icon}</span>
            <span className="text-sm text-gray-300">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideFormateur() {
  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <SectionTitle sub="Un portail dédié pour que chaque formateur gère son activité en toute autonomie.">
        👨‍🏫 Espace Formateur
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          {FORMATEUR_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3 rounded-xl bg-gray-800/60 border border-gray-700 px-5 py-4">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
              <span className="text-gray-200">{f}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
            <UserCheck className="h-10 w-10 text-cyan-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Accès sécurisé</h3>
          <p className="text-gray-400 mb-6">Chaque formateur accède uniquement à son propre espace. Ses sessions, ses stagiaires, ses documents.</p>
          <div className="rounded-xl bg-gray-900 p-4 text-left font-mono text-sm">
            <p className="text-gray-500 mb-1">Email</p>
            <p className="text-cyan-400">formateur@rfc.fr</p>
            <p className="text-gray-500 mt-3 mb-1">Rôle</p>
            <p className="text-green-400">formateur</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideClient() {
  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <SectionTitle sub="Donnez à vos clients un accès transparent sur leurs formations et stagiaires.">
        🏢 Espace Client
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Portail entreprise</h3>
          <p className="text-gray-400 mb-6">Chaque entreprise cliente dispose de son propre espace avec toutes ses données.</p>
          <div className="space-y-2 text-left">
            {["Devis & factures téléchargeables", "Attestations de formation", "Suivi des inscriptions"].map((i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {i}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {CLIENT_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3 rounded-xl bg-gray-800/60 border border-gray-700 px-5 py-4">
              <CheckCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <span className="text-gray-200">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlidePublic() {
  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <SectionTitle sub="Des pages accessibles sans connexion pour simplifier l'expérience des stagiaires.">
        🌐 Pages Publiques
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <QrCode className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Inscription en ligne</h3>
              <p className="text-sm text-gray-400">Via QR code ou lien partagé</p>
            </div>
          </div>
          <p className="text-gray-300 mb-6">Chaque session génère un QR code unique. Les stagiaires scannent, remplissent leurs informations et s&apos;inscrivent directement depuis leur téléphone.</p>
          <div className="space-y-2">
            {["Nom, prénom, email", "Entreprise", "Confirmation automatique"].map((i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <ChevronRight className="h-3.5 w-3.5 text-green-400" /> {i}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Star className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Formulaire d&apos;évaluation</h3>
              <p className="text-sm text-gray-400">Lien personnel sécurisé</p>
            </div>
          </div>
          <p className="text-gray-300 mb-6">Chaque stagiaire reçoit un lien unique pour évaluer sa formation. Interface mobile-first, intuitive, sans compte requis.</p>
          <div className="space-y-2">
            {["Accessible sur mobile et tablette", "Questions personnalisées", "Résultats instantanés dans le CRM"].map((i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <ChevronRight className="h-3.5 w-3.5 text-violet-400" /> {i}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-blue-800 bg-blue-900/10 p-5 flex items-center gap-4">
        <Smartphone className="h-8 w-8 text-blue-400 shrink-0" />
        <p className="text-gray-300">Toutes les pages publiques sont <span className="text-white font-semibold">100% responsive</span> — optimisées pour smartphone, tablette et desktop.</p>
      </div>
    </div>
  );
}

function SlideIA() {
  return (
    <div className="px-6 py-16 max-w-4xl mx-auto">
      <SectionTitle sub="L'intelligence artificielle intégrée directement dans votre workflow de formation.">
        🤖 Intelligence Artificielle
      </SectionTitle>
      <div className="rounded-2xl border border-violet-700 bg-violet-900/10 p-8 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Analyse automatique des évaluations</h3>
            <p className="text-violet-400 text-sm">Propulsé par Claude — Anthropic</p>
          </div>
        </div>
        <p className="text-gray-300 mb-6 leading-relaxed">
          En un clic, l&apos;IA analyse l&apos;intégralité d&apos;une évaluation (notes, réponses, commentaires) et génère une synthèse professionnelle structurée en français.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { t: "Synthèse générale", d: "Résumé en 2-3 phrases de la qualité perçue" },
            { t: "Points forts", d: "Ce qui a le mieux fonctionné dans la formation" },
            { t: "Points d'amélioration", d: "Les axes identifiés pour progresser" },
            { t: "Recommandations", d: "Actions concrètes à mettre en œuvre" },
          ].map((i) => (
            <div key={i.t} className="rounded-xl bg-gray-800 border border-gray-700 p-4">
              <p className="text-sm font-semibold text-violet-300 mb-1">{i.t}</p>
              <p className="text-xs text-gray-400">{i.d}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5 flex items-center gap-4">
        <Award className="h-8 w-8 text-amber-400 shrink-0" />
        <p className="text-gray-300">Le texte généré est <span className="text-white font-semibold">entièrement modifiable</span> avant utilisation — vous gardez le contrôle total.</p>
      </div>
    </div>
  );
}

function SlideTechnologie() {
  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <SectionTitle sub="Une architecture moderne, sécurisée et pensée pour évoluer avec votre activité.">
        ⚙️ Technologies & Architecture
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {TECH_STACK.map((t) => (
          <div key={t.label} className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800/60 px-5 py-4">
            <div className="w-2 h-8 rounded-full bg-gray-600" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t.label}</p>
              <p className={`font-semibold ${t.color}`}>{t.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Lock, titre: "Sécurité", desc: "Authentification JWT, rôles séparés, toutes les routes protégées par middleware." },
          { icon: Globe, titre: "Cloud", desc: "Base de données hébergée sur Supabase (Europe). Disponibilité 99.9%." },
          { icon: LineChart, titre: "Évolutif", desc: "Architecture modulaire — nouvelles fonctionnalités ajoutables sans refonte." },
        ].map((c) => (
          <div key={c.titre} className="rounded-2xl border border-gray-700 bg-gray-800/60 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <c.icon className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="font-bold text-white mb-2">{c.titre}</h3>
            <p className="text-sm text-gray-400">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideConclusion() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-16">
      <Image src="/logorescue.png" alt="RFC" width={100} height={100} className="rounded-2xl shadow-xl mb-8" />
      <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
        Une solution <span className="text-red-500">sur-mesure</span>
      </h2>
      <p className="text-gray-400 text-xl max-w-2xl mb-12">
        Conçue spécifiquement pour Rescue Formation Conseil — chaque fonctionnalité répond à un besoin réel de votre activité.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
        {[
          { icon: Zap, color: "text-amber-400 bg-amber-500/10", titre: "Gain de temps", desc: "Automatisez devis, factures, PDF, évaluations et BPF." },
          { icon: ShieldCheck, color: "text-green-400 bg-green-500/10", titre: "Conformité", desc: "Qualiopi, BPF, attestations — tous les documents réglementaires." },
          { icon: TrendingUp, color: "text-blue-400 bg-blue-500/10", titre: "Croissance", desc: "Suivez votre CA, gérez plus de clients, formateurs et sessions." },
        ].map((c) => (
          <div key={c.titre} className="rounded-2xl border border-gray-700 bg-gray-800/60 p-7">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${c.color}`}>
              <c.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-white mb-2">{c.titre}</h3>
            <p className="text-sm text-gray-400">{c.desc}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-red-800 bg-red-900/10 px-8 py-5 flex items-center gap-4">
        <Mail className="h-6 w-6 text-red-400 shrink-0" />
        <p className="text-gray-300">Prêt à démarrer ? Connectez-vous sur <span className="text-white font-semibold">votre plateforme RFC</span></p>
      </div>
    </div>
  );
}

const SLIDE_COMPONENTS = [
  SlideAccueil, SlideAdmin, SlideCommercial, SlideEvaluations,
  SlideFormateur, SlideClient, SlidePublic, SlideIA, SlideTechnologie, SlideConclusion,
];

const SLIDE_LABELS = [
  "Accueil", "Admin", "Commercial", "Évaluations",
  "Formateur", "Client", "Public", "IA", "Technologie", "Conclusion",
];

// ── Page principale ────────────────────────────────────────────────────────
export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;
  const SlideComponent = SLIDE_COMPONENTS[current];

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(total - 1, c + 1));

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" onKeyDown={(e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); }} tabIndex={0}>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>

      {/* Slide counter */}
      <div className="fixed top-4 right-6 z-50 text-xs text-gray-500 font-mono bg-gray-900/80 px-3 py-1.5 rounded-full border border-gray-700">
        {current + 1} / {total}
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-y-auto">
        <SlideComponent />
      </div>

      {/* Navigation bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={prev}
            disabled={current === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30 transition-colors text-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Précédent
          </button>

          {/* Dots navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {SLIDE_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                title={label}
                className={`transition-all rounded-full ${
                  i === current
                    ? "w-6 h-2.5 bg-red-500"
                    : "w-2.5 h-2.5 bg-gray-700 hover:bg-gray-500"
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            disabled={current === total - 1}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-30 transition-colors text-sm font-medium"
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom padding for nav */}
      <div className="h-16" />
    </div>
  );
}
