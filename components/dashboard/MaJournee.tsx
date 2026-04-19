"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Send, Receipt, Calendar, ClipboardCheck,
  ClipboardList, AlertTriangle, UserPlus, Clock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface Data {
  sessionsJour: { id: string; dateDebut: string; lieu: string | null; formation: { titre: string }; formateur: { prenom: string; nom: string } | null; _count: { inscriptions: number } }[];
  devisARelancer: { id: string; numero: string; montantTTC: number; updatedAt: string; entreprise: { nom: string } | null }[];
  facturesEnRetard: { id: string; numero: string; montantTTC: number; dateEcheance: string; entreprise: { nom: string } | null }[];
  besoinsAQualifier: { id: string; titre: string; createdAt: string; entreprise: { nom: string } | null; contact: { prenom: string; nom: string } | null }[];
  recyclages: { id: string; label: string; expireLe: string; contact: { id: string; prenom: string; nom: string; entreprise: { nom: string } | null } }[];
  inscriptionsAValider: { id: string; contact: { prenom: string; nom: string }; session: { id: string; dateDebut: string; formation: { titre: string } } }[];
}

export function MaJournee() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/tasks")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 mb-6">
        <div className="h-6 w-40 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const total = data.sessionsJour.length + data.devisARelancer.length + data.facturesEnRetard.length + data.besoinsAQualifier.length + data.recyclages.length + data.inscriptionsAValider.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-950/20 p-6 mb-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-green-500" />
          <div>
            <h2 className="text-lg font-semibold text-green-400">Tout est a jour</h2>
            <p className="text-sm text-gray-400">Aucune action en attente pour aujourd&apos;hui.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" /> Ma journee
          </h2>
          <p className="text-sm text-gray-400">{total} action{total > 1 ? "s" : ""} en attente</p>
        </div>
        <span className="text-xs text-gray-500">{format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}</span>
      </div>

      <div className="space-y-4">
        {data.sessionsJour.length > 0 && (
          <Section title={`Sessions du jour (${data.sessionsJour.length})`} icon={Calendar} color="red">
            {data.sessionsJour.map((s) => (
              <TaskRow key={s.id} href={`/sessions/${s.id}`} label={s.formation.titre}
                sublabel={`${format(new Date(s.dateDebut), "HH:mm")} — ${s._count.inscriptions} inscrits${s.formateur ? ` — ${s.formateur.prenom} ${s.formateur.nom}` : " — sans formateur"}`} />
            ))}
          </Section>
        )}
        {data.inscriptionsAValider.length > 0 && (
          <Section title={`Inscriptions a valider (${data.inscriptionsAValider.length})`} icon={UserPlus} color="blue">
            {data.inscriptionsAValider.slice(0, 5).map((i) => (
              <TaskRow key={i.id} href={`/sessions/${i.session.id}`} label={`${i.contact.prenom} ${i.contact.nom}`}
                sublabel={`${i.session.formation.titre} — ${format(new Date(i.session.dateDebut), "dd/MM")}`} />
            ))}
          </Section>
        )}
        {data.devisARelancer.length > 0 && (
          <Section title={`Devis a relancer (${data.devisARelancer.length})`} icon={Send} color="amber">
            {data.devisARelancer.slice(0, 5).map((d) => (
              <TaskRow key={d.id} href={`/commercial/devis/${d.id}`} label={`${d.numero} — ${d.entreprise?.nom ?? "Sans entreprise"}`}
                sublabel={`${d.montantTTC.toFixed(2)} EUR — envoye il y a ${formatDistanceToNow(new Date(d.updatedAt), { locale: fr })}`} />
            ))}
          </Section>
        )}
        {data.facturesEnRetard.length > 0 && (
          <Section title={`Factures en retard (${data.facturesEnRetard.length})`} icon={Receipt} color="red" urgent>
            {data.facturesEnRetard.slice(0, 5).map((f) => (
              <TaskRow key={f.id} href={`/commercial/factures/${f.id}`} label={`${f.numero} — ${f.entreprise?.nom}`}
                sublabel={`${f.montantTTC.toFixed(2)} EUR — echue le ${format(new Date(f.dateEcheance), "dd/MM/yyyy")}`} urgent />
            ))}
          </Section>
        )}
        {data.besoinsAQualifier.length > 0 && (
          <Section title={`Besoins a qualifier (${data.besoinsAQualifier.length})`} icon={ClipboardList} color="purple">
            {data.besoinsAQualifier.slice(0, 5).map((b) => (
              <TaskRow key={b.id} href={`/besoins/${b.id}`} label={b.titre}
                sublabel={`${b.entreprise?.nom ?? (b.contact ? `${b.contact.prenom} ${b.contact.nom}` : "Sans origine")} — ouvert depuis ${formatDistanceToNow(new Date(b.createdAt), { locale: fr })}`} />
            ))}
          </Section>
        )}
        {data.recyclages.length > 0 && (
          <Section title={`Recyclages a venir (${data.recyclages.length})`} icon={AlertTriangle} color="amber">
            {data.recyclages.slice(0, 5).map((r) => (
              <TaskRow key={r.id} href={`/contacts/${r.contact.id}`} label={`${r.contact.prenom} ${r.contact.nom} — ${r.label}`}
                sublabel={`${r.contact.entreprise?.nom ?? "Individuel"} — expire le ${format(new Date(r.expireLe), "dd/MM/yyyy")}`} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color: string; urgent?: boolean; children: React.ReactNode }) {
  const colorClasses: Record<string, string> = { red: "text-red-400", amber: "text-amber-400", blue: "text-blue-400", purple: "text-purple-400" };
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${colorClasses[color] || "text-gray-300"}`}>
        <Icon className="h-4 w-4" /> {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TaskRow({ href, label, sublabel, urgent }: { href: string; label: string; sublabel?: string; urgent?: boolean }) {
  return (
    <Link href={href} className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors ${urgent ? "bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-800/40" : "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700/50"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sublabel}</p>}
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
    </Link>
  );
}
