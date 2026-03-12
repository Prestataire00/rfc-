"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteFormation } from "@/app/(dashboard)/formations/actions";
import { Trash2 } from "lucide-react";

export function DeleteFormationButton({ formationId }: { formationId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="icon" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      }
      title="Supprimer cette formation ?"
      description="Cette action supprimera la formation et toutes ses sessions. Cette action est irréversible."
      onConfirm={() => deleteFormation(formationId)}
    />
  );
}
