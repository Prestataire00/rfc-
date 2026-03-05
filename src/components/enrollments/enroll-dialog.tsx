"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enrollStagiaire } from "@/app/(dashboard)/formations/[formationId]/sessions/[sessionId]/actions";
import { Plus } from "lucide-react";

interface Props {
  sessionId: string;
  formationId: string;
  stagiaires: { id: string; name: string | null; email: string }[];
  organizations: { id: string; name: string }[];
}

export function EnrollDialog({ sessionId, formationId, stagiaires, organizations }: Props) {
  const [open, setOpen] = useState(false);
  const boundAction = enrollStagiaire.bind(null, sessionId, formationId);

  const [state, formAction, isPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await boundAction(prev, formData);
      if (!result) setOpen(false);
      return result;
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Inscrire un stagiaire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscrire un stagiaire</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="stagiaireId">Stagiaire *</Label>
            <Select name="stagiaireId" required>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un stagiaire" />
              </SelectTrigger>
              <SelectContent>
                {stagiaires.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name ?? s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origin">Origine</Label>
            <Select name="origin" defaultValue="CENTRE">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUEL">Individuel</SelectItem>
                <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
                <SelectItem value="CENTRE">Centre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client (optionnel)</Label>
            <Select name="clientId">
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Inscription..." : "Inscrire"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
