"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sessionSchema } from "@/lib/validations/formation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "../../actions";

const validTransitions: Record<string, string[]> = {
  PLANIFIEE: ["CONFIRMEE", "ANNULEE"],
  CONFIRMEE: ["EN_COURS", "ANNULEE"],
  EN_COURS: ["TERMINEE", "ANNULEE"],
  TERMINEE: [],
  ANNULEE: [],
};

export async function createSession(
  formationId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Non autorisé" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = sessionSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const newSession = await db.sessionFormation.create({
    data: {
      formationId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      modality: parsed.data.modality,
      location: parsed.data.location || null,
      maxParticipants: parsed.data.maxParticipants,
      minParticipants: parsed.data.minParticipants,
      formateurId: parsed.data.formateurId || null,
      trainerCost: parsed.data.trainerCost ?? null,
      notes: parsed.data.notes || null,
    },
  });

  redirect(`/formations/${formationId}/sessions/${newSession.id}`);
}

export async function updateSession(
  sessionId: string,
  formationId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Non autorisé" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = sessionSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.sessionFormation.update({
    where: { id: sessionId },
    data: {
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      modality: parsed.data.modality,
      location: parsed.data.location || null,
      maxParticipants: parsed.data.maxParticipants,
      minParticipants: parsed.data.minParticipants,
      formateurId: parsed.data.formateurId || null,
      trainerCost: parsed.data.trainerCost ?? null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/formations/${formationId}/sessions/${sessionId}`);
  redirect(`/formations/${formationId}/sessions/${sessionId}`);
}

export async function deleteSession(
  sessionId: string,
  formationId: string
): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return;

  await db.sessionFormation.delete({ where: { id: sessionId } });
  revalidatePath(`/formations/${formationId}`);
  redirect(`/formations/${formationId}`);
}

export async function updateSessionStatus(
  sessionId: string,
  formationId: string,
  newStatus: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Non autorisé" };
  }

  const current = await db.sessionFormation.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });

  if (!current) return { error: "Session introuvable" };

  const allowed = validTransitions[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { error: `Transition de ${current.status} vers ${newStatus} non autorisée` };
  }

  await db.sessionFormation.update({
    where: { id: sessionId },
    data: { status: newStatus as "PLANIFIEE" | "CONFIRMEE" | "EN_COURS" | "TERMINEE" | "ANNULEE" },
  });

  revalidatePath(`/formations/${formationId}/sessions/${sessionId}`);
  return {};
}
