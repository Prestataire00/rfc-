"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formationSchema } from "@/lib/validations/formation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function createFormation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Non autorisé" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = formationSchema.safeParse({
    ...raw,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const formation = await db.formation.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      objectives: parsed.data.objectives || null,
      program: parsed.data.program || null,
      durationHours: parsed.data.durationHours,
      price: parsed.data.price,
      category: parsed.data.category,
      prerequisites: parsed.data.prerequisites || null,
      certificationName: parsed.data.certificationName || null,
      certificationBody: parsed.data.certificationBody || null,
      isActive: parsed.data.isActive,
    },
  });

  redirect(`/formations/${formation.id}`);
}

export async function updateFormation(
  formationId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Non autorisé" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = formationSchema.safeParse({
    ...raw,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.formation.update({
    where: { id: formationId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      objectives: parsed.data.objectives || null,
      program: parsed.data.program || null,
      durationHours: parsed.data.durationHours,
      price: parsed.data.price,
      category: parsed.data.category,
      prerequisites: parsed.data.prerequisites || null,
      certificationName: parsed.data.certificationName || null,
      certificationBody: parsed.data.certificationBody || null,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath(`/formations/${formationId}`);
  redirect(`/formations/${formationId}`);
}

export async function deleteFormation(formationId: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return;

  await db.formation.delete({ where: { id: formationId } });
  revalidatePath("/formations");
  redirect("/formations");
}
