"use client";

import { Button } from "@/components/ui/button";
import { updateSessionStatus } from "@/app/(dashboard)/formations/[formationId]/sessions/actions";
import { useTransition } from "react";
import { CheckCircle, Play, Square, XCircle } from "lucide-react";

const transitions: Record<string, { label: string; target: string; icon: React.ReactNode; variant: "default" | "outline" | "destructive" }[]> = {
  PLANIFIEE: [
    { label: "Confirmer", target: "CONFIRMEE", icon: <CheckCircle className="mr-1 h-3 w-3" />, variant: "default" },
    { label: "Annuler", target: "ANNULEE", icon: <XCircle className="mr-1 h-3 w-3" />, variant: "destructive" },
  ],
  CONFIRMEE: [
    { label: "Démarrer", target: "EN_COURS", icon: <Play className="mr-1 h-3 w-3" />, variant: "default" },
    { label: "Annuler", target: "ANNULEE", icon: <XCircle className="mr-1 h-3 w-3" />, variant: "destructive" },
  ],
  EN_COURS: [
    { label: "Terminer", target: "TERMINEE", icon: <Square className="mr-1 h-3 w-3" />, variant: "default" },
    { label: "Annuler", target: "ANNULEE", icon: <XCircle className="mr-1 h-3 w-3" />, variant: "destructive" },
  ],
  TERMINEE: [],
  ANNULEE: [],
};

interface Props {
  sessionId: string;
  formationId: string;
  currentStatus: string;
}

export function SessionStatusActions({ sessionId, formationId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const available = transitions[currentStatus] ?? [];

  if (available.length === 0) return null;

  return (
    <div className="flex gap-2">
      {available.map((t) => (
        <Button
          key={t.target}
          variant={t.variant}
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(() => updateSessionStatus(sessionId, formationId, t.target))
          }
        >
          {t.icon}
          {t.label}
        </Button>
      ))}
    </div>
  );
}
