const COLORS: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  ready: "bg-blue-200 text-blue-800",
  sent: "bg-yellow-200 text-yellow-900",
  viewed: "bg-purple-200 text-purple-900",
  signed: "bg-green-200 text-green-900",
  completed: "bg-green-600 text-white",
  expired: "bg-red-200 text-red-900",
  cancelled: "bg-gray-400 text-white",
  rejected: "bg-red-500 text-white",
};

const LABELS: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prêt",
  sent: "Envoyé",
  viewed: "Vu",
  signed: "Signé",
  completed: "Finalisé",
  expired: "Expiré",
  cancelled: "Annulé",
  rejected: "Refusé",
};

export function SignatureStatusBadge({ statut }: { statut: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${COLORS[statut] ?? COLORS.draft}`}
    >
      {LABELS[statut] ?? statut}
    </span>
  );
}
