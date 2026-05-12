"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";
import type { AssignableUser } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "session" | "prospect";
  entityId: string;
  etape: string;
  assignableUsers: AssignableUser[];
  onCreated: () => Promise<void>;
};

export function TaskCreateDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  etape,
  assignableUsers,
  onCreated,
}: Props) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!titre.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/${entityType}s/${entityId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etape,
          titre: titre.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          assigneeId: assigneeId || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Erreur" }));
        notify.error("Création impossible", j.error);
        return;
      }
      notify.success("Tâche créée");
      setTitre("");
      setDescription("");
      setDueDate("");
      setAssigneeId("");
      onOpenChange(false);
      await onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="task-titre">Titre *</Label>
            <Input
              id="task-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Relancer le client par téléphone"
            />
          </div>
          <div>
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-due">Échéance</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="task-assignee">Assigner à</Label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-2 text-sm"
              >
                <option value="">— Non assigné —</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.prenom} {u.nom}
                    {u.role === "formateur" ? " (formateur)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={submitting || !titre.trim()}>
            {submitting ? "…" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
