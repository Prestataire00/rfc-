"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { FormState } from "@/app/(dashboard)/formations/actions";

interface Formateur {
  id: string;
  name: string | null;
  email: string;
}

interface SessionFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  formateurs: Formateur[];
  defaultValues?: {
    startDate?: Date;
    endDate?: Date;
    modality?: string;
    location?: string | null;
    maxParticipants?: number;
    minParticipants?: number;
    formateurId?: string | null;
    trainerCost?: number | string | null;
    notes?: string | null;
  };
}

function formatDateForInput(date?: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function SessionForm({ action, formateurs, defaultValues }: SessionFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-6">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={formatDateForInput(defaultValues?.startDate)}
                required
              />
              {state?.fieldErrors?.startDate && (
                <p className="text-xs text-destructive">{state.fieldErrors.startDate[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={formatDateForInput(defaultValues?.endDate)}
                required
              />
              {state?.fieldErrors?.endDate && (
                <p className="text-xs text-destructive">{state.fieldErrors.endDate[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modality">Modalité</Label>
              <Select name="modality" defaultValue={defaultValues?.modality ?? "PRESENTIEL"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENTIEL">Présentiel</SelectItem>
                  <SelectItem value="DISTANCIEL">Distanciel</SelectItem>
                  <SelectItem value="MIXTE">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lieu</Label>
              <Input
                id="location"
                name="location"
                placeholder="Adresse ou URL"
                defaultValue={defaultValues?.location ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Places max</Label>
              <Input
                id="maxParticipants"
                name="maxParticipants"
                type="number"
                min={1}
                defaultValue={defaultValues?.maxParticipants ?? 12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minParticipants">Places min</Label>
              <Input
                id="minParticipants"
                name="minParticipants"
                type="number"
                min={1}
                defaultValue={defaultValues?.minParticipants ?? 1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formateurId">Formateur</Label>
              <Select name="formateurId" defaultValue={defaultValues?.formateurId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un formateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Non assigné</SelectItem>
                  {formateurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name ?? f.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainerCost">Coût formateur (EUR)</Label>
              <Input
                id="trainerCost"
                name="trainerCost"
                type="number"
                step="0.01"
                min={0}
                defaultValue={defaultValues?.trainerCost?.toString() ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={defaultValues?.notes ?? ""}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
