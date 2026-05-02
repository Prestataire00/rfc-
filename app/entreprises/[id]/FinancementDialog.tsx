"use client";

import { X } from "lucide-react";
import { FINANCEMENT_TYPES, FINANCEMENT_STATUTS } from "./types";

type FinancementForm = {
  type: string;
  montant: string;
  organisme: string;
  reference: string;
  statut: string;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  financementForm: FinancementForm;
  setFinancementForm: React.Dispatch<React.SetStateAction<FinancementForm>>;
  savingFinancement: boolean;
  onSubmit: () => void;
};

export function FinancementDialog({
  open,
  onClose,
  financementForm,
  setFinancementForm,
  savingFinancement,
  onSubmit,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100">Ajouter un financement</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
            <select
              value={financementForm.type}
              onChange={(e) => setFinancementForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100"
            >
              {Object.entries(FINANCEMENT_TYPES).map(([val, info]) => (
                <option key={val} value={val}>{info.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Montant (€) *</label>
            <input
              type="number"
              value={financementForm.montant}
              onChange={(e) => setFinancementForm((f) => ({ ...f, montant: e.target.value }))}
              className="w-full h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Organisme payeur</label>
            <input
              type="text"
              value={financementForm.organisme}
              onChange={(e) => setFinancementForm((f) => ({ ...f, organisme: e.target.value }))}
              className="w-full h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100"
              placeholder="Ex: OPCO Atlas, France Travail…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Référence OPCO</label>
            <input
              type="text"
              value={financementForm.reference}
              onChange={(e) => setFinancementForm((f) => ({ ...f, reference: e.target.value }))}
              className="w-full h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100"
              placeholder="Optionnel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Statut</label>
            <select
              value={financementForm.statut}
              onChange={(e) => setFinancementForm((f) => ({ ...f, statut: e.target.value }))}
              className="w-full h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100"
            >
              {Object.entries(FINANCEMENT_STATUTS).map(([val, info]) => (
                <option key={val} value={val}>{info.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={financementForm.notes}
              onChange={(e) => setFinancementForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100"
              rows={2}
              placeholder="Optionnel"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={savingFinancement || !financementForm.montant}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {savingFinancement ? "Enregistrement…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
