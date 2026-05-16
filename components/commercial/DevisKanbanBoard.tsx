"use client";

// Pipeline Kanban DnD pour /commercial — adresse le cahier des charges §2.3 :
// "Vue Kanban permettant de suivre l'avancement des devis à travers
//  différentes étapes (ex: Brouillon, Envoyé, Signé, Refusé)."
//
// Implémentation @dnd-kit/core (lib mainstream React, ~10kb gzipped, accessible).
// On drag : optimistic update local + PATCH /api/devis/[id] avec nouveau statut.
// Rollback en cas d'échec API.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { StatutBadge } from "@/components/shared/StatutBadge";

export type Devis = {
  id: string;
  numero: string;
  objet: string;
  montantTTC: number;
  statut: string;
  entreprise: { nom: string } | null;
  contact: { nom: string; prenom: string } | null;
};

export type ColumnDef = {
  key: string;
  label: string;
  color: string;
};

export type StatutMeta = { label: string; color: string };

interface Props {
  initialDevis: Devis[];
  columns: ColumnDef[];
  statutsMeta: Record<string, StatutMeta>;
  /**
   * Endpoint PATCH pour mettre à jour le statut d'un devis.
   * Reçoit { id, statut }, doit retourner le devis mis à jour.
   * Par défaut : `/api/devis/${id}` avec body { statut }.
   */
  onStatusChange?: (devisId: string, newStatut: string) => Promise<void>;
}

const getClientName = (d: Devis): string => {
  if (d.entreprise) return d.entreprise.nom;
  if (d.contact) return `${d.contact.prenom} ${d.contact.nom}`;
  return "Sans client";
};

function DraggableCard({ devis, statutMeta }: { devis: Devis; statutMeta?: StatutMeta }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: devis.id,
    data: { statut: devis.statut },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Empêche la navigation si on est en plein drag (clic vs drag).
        // @dnd-kit gère le seuil via PointerSensor (activationConstraint).
        if (isDragging) return;
        e.stopPropagation();
        router.push(`/commercial/devis/${devis.id}`);
      }}
      className={cn(
        "bg-gray-800 rounded-md border border-gray-700 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-red-300 transition-all",
        isDragging && "ring-2 ring-red-500",
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-xs font-mono text-gray-400">{devis.numero}</span>
        {statutMeta && <StatutBadge label={statutMeta.label} color={statutMeta.color} />}
      </div>
      <p className="text-sm font-medium text-gray-100 line-clamp-2 mb-2">{devis.objet}</p>
      <p className="text-xs text-gray-400 mb-1">{getClientName(devis)}</p>
      <p className="text-sm font-semibold text-gray-200">{formatCurrency(devis.montantTTC)}</p>
    </div>
  );
}

function DroppableColumn({ column, devis, statutsMeta, isDragTarget }: {
  column: ColumnDef;
  devis: Devis[];
  statutsMeta: Record<string, StatutMeta>;
  isDragTarget: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    data: { columnKey: column.key },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-64 rounded-lg border-2 p-3 transition-colors",
        column.color,
        isOver && "ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900",
        isDragTarget && !isOver && "bg-opacity-50",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">{column.label}</h3>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-xs font-medium text-gray-400 border">
          {devis.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {devis.map((d) => (
          <DraggableCard key={d.id} devis={d} statutMeta={statutsMeta[d.statut]} />
        ))}
        {devis.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Aucun devis</p>
        )}
      </div>
    </div>
  );
}

export function DevisKanbanBoard({ initialDevis, columns, statutsMeta, onStatusChange }: Props) {
  const [devisList, setDevisList] = useState<Devis[]>(initialDevis);
  const [draggingStatut, setDraggingStatut] = useState<string | null>(null);

  // Re-sync si la prop change (refresh SWR par exemple)
  if (initialDevis !== devisList && devisList.length === 0 && initialDevis.length > 0) {
    setDevisList(initialDevis);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Activation après 8px de mouvement → permet un vrai clic sans déclencher de drag.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const devisByStatut = columns.reduce<Record<string, Devis[]>>((acc, col) => {
    acc[col.key] = devisList.filter((d) => d.statut === col.key);
    return acc;
  }, {});

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingStatut(null);
    const { active, over } = event;
    if (!over) return;

    const devisId = String(active.id);
    const newStatut = String(over.id);
    const devis = devisList.find((d) => d.id === devisId);
    if (!devis || devis.statut === newStatut) return;

    // Optimistic update local
    const previousStatut = devis.statut;
    setDevisList((prev) =>
      prev.map((d) => (d.id === devisId ? { ...d, statut: newStatut } : d)),
    );

    try {
      if (onStatusChange) {
        await onStatusChange(devisId, newStatut);
      } else {
        await api.patch(`/api/devis/${devisId}`, { statut: newStatut });
      }
      notify.success(`Devis déplacé vers "${columns.find((c) => c.key === newStatut)?.label ?? newStatut}"`);
    } catch (err) {
      // Rollback
      setDevisList((prev) =>
        prev.map((d) => (d.id === devisId ? { ...d, statut: previousStatut } : d)),
      );
      const msg = err instanceof Error ? err.message : "Erreur lors du changement de statut";
      notify.error(msg);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDraggingStatut(String(e.active.data.current?.statut ?? ""))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingStatut(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <DroppableColumn
            key={col.key}
            column={col}
            devis={devisByStatut[col.key] || []}
            statutsMeta={statutsMeta}
            isDragTarget={draggingStatut !== null && draggingStatut !== col.key}
          />
        ))}
      </div>
    </DndContext>
  );
}
