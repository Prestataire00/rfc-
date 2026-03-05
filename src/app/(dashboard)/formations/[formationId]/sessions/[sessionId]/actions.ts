"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { enrollmentSchema } from "@/lib/validations/formation";
import { revalidatePath } from "next/cache";
import type { FormState } from "../../../../actions";

export async function enrollStagiaire(
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
  const parsed = enrollmentSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Check capacity
  const sessionData = await db.sessionFormation.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { enrollments: true } } },
  });

  if (!sessionData) return { error: "Session introuvable" };
  if (sessionData._count.enrollments >= sessionData.maxParticipants) {
    return { error: "La session est complète" };
  }

  // Check duplicate
  const existing = await db.enrollment.findUnique({
    where: {
      sessionId_stagiaireId: {
        sessionId,
        stagiaireId: parsed.data.stagiaireId,
      },
    },
  });

  if (existing) return { error: "Ce stagiaire est déjà inscrit" };

  await db.enrollment.create({
    data: {
      sessionId,
      stagiaireId: parsed.data.stagiaireId,
      origin: parsed.data.origin,
      clientId: parsed.data.clientId || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/formations/${formationId}/sessions/${sessionId}`);
  return null;
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  formationId: string,
  sessionId: string,
  newStatus: string
): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return;

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { status: newStatus as "INSCRIT" | "CONFIRME" | "PRESENT" | "ABSENT" | "ANNULE" },
  });

  revalidatePath(`/formations/${formationId}/sessions/${sessionId}`);
}

export async function removeEnrollment(
  enrollmentId: string,
  formationId: string,
  sessionId: string
): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return;

  await db.enrollment.delete({ where: { id: enrollmentId } });
  revalidatePath(`/formations/${formationId}/sessions/${sessionId}`);
}
