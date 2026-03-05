"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  updateEnrollmentStatus,
  removeEnrollment,
} from "@/app/(dashboard)/formations/[formationId]/sessions/[sessionId]/actions";
import { MoreHorizontal, Trash2 } from "lucide-react";

interface Props {
  enrollmentId: string;
  sessionId: string;
  formationId: string;
  currentStatus: string;
}

const statusOptions = [
  { value: "INSCRIT", label: "Inscrit" },
  { value: "CONFIRME", label: "Confirmé" },
  { value: "PRESENT", label: "Présent" },
  { value: "ABSENT", label: "Absent" },
  { value: "ANNULE", label: "Annulé" },
];

export function EnrollmentActions({
  enrollmentId,
  sessionId,
  formationId,
  currentStatus,
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statusOptions
            .filter((s) => s.value !== currentStatus)
            .map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() =>
                  startTransition(() =>
                    updateEnrollmentStatus(enrollmentId, formationId, sessionId, s.value)
                  )
                }
              >
                {s.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
        title="Supprimer cette inscription ?"
        description="Le stagiaire sera désinscrit de cette session."
        onConfirm={() =>
          startTransition(() => removeEnrollment(enrollmentId, formationId, sessionId))
        }
      />
    </div>
  );
}
