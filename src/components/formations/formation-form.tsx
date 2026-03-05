"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { FormState } from "@/app/(dashboard)/formations/actions";

const categories = [
  { value: "BUREAUTIQUE", label: "Bureautique" },
  { value: "INFORMATIQUE", label: "Informatique" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "LANGUES", label: "Langues" },
  { value: "SECURITE", label: "Sécurité" },
  { value: "REGLEMENTAIRE", label: "Réglementaire" },
  { value: "SOFT_SKILLS", label: "Soft Skills" },
  { value: "AUTRE", label: "Autre" },
];

interface FormationFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    title?: string;
    description?: string | null;
    objectives?: string | null;
    program?: string | null;
    durationHours?: number;
    price?: number | string;
    category?: string;
    prerequisites?: string | null;
    certificationName?: string | null;
    certificationBody?: string | null;
    isActive?: boolean;
  };
}

export function FormationForm({ action, defaultValues }: FormationFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-6">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={defaultValues?.title}
                required
              />
              {state?.fieldErrors?.title && (
                <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select name="category" defaultValue={defaultValues?.category ?? "AUTRE"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationHours">Durée (heures) *</Label>
              <Input
                id="durationHours"
                name="durationHours"
                type="number"
                min={1}
                defaultValue={defaultValues?.durationHours}
                required
              />
              {state?.fieldErrors?.durationHours && (
                <p className="text-xs text-destructive">{state.fieldErrors.durationHours[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix (EUR) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min={0}
                defaultValue={defaultValues?.price?.toString()}
                required
              />
              {state?.fieldErrors?.price && (
                <p className="text-xs text-destructive">{state.fieldErrors.price[0]}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={defaultValues?.isActive ?? true}
              />
              <Label htmlFor="isActive">Formation active</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={defaultValues?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectives">Objectifs pédagogiques</Label>
            <Textarea
              id="objectives"
              name="objectives"
              rows={3}
              defaultValue={defaultValues?.objectives ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Programme détaillé</Label>
            <Textarea
              id="program"
              name="program"
              rows={4}
              defaultValue={defaultValues?.program ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prerequisites">Prérequis</Label>
            <Textarea
              id="prerequisites"
              name="prerequisites"
              rows={2}
              defaultValue={defaultValues?.prerequisites ?? ""}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="certificationName">Certification (code)</Label>
              <Input
                id="certificationName"
                name="certificationName"
                placeholder="Ex: RS1234"
                defaultValue={defaultValues?.certificationName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificationBody">Organisme certificateur</Label>
              <Input
                id="certificationBody"
                name="certificationBody"
                defaultValue={defaultValues?.certificationBody ?? ""}
              />
            </div>
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
