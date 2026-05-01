"use client";

import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declarationChecked: boolean;
  setDeclarationChecked: (checked: boolean) => void;
  onConfirm: () => void;
};

export function PasseportPreventionDialog({
  open,
  onOpenChange,
  declarationChecked,
  setDeclarationChecked,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-amber-500" /> Declaration Passeport Prevention
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-gray-300">
            Cette formation est certifiante. Conformement au <strong>decret 2022-1434</strong>, la declaration au Passeport Prevention est obligatoire avant d&apos;archiver la session.
          </p>
          <label className="flex items-start gap-3 p-3 rounded-md border border-gray-700 bg-gray-900 cursor-pointer">
            <input
              type="checkbox"
              checked={declarationChecked}
              onChange={(e) => setDeclarationChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-sm text-gray-200">
              Je confirme avoir effectue la declaration au Passeport Prevention pour tous les stagiaires de cette session certifiante.
            </span>
          </label>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Annuler</button>
          <Button onClick={onConfirm} disabled={!declarationChecked} className="bg-amber-600 hover:bg-amber-700">
            Valider et terminer la session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
