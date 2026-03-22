"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function login(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Email ou mot de passe incorrect.";
    }
    throw error;
  }

  // Get user role for redirect
  const user = await db.user.findUnique({
    where: { email },
    select: { role: true },
  });

  const redirectMap: Record<string, string> = {
    ADMIN: "/",
    FORMATEUR: "/portail-formateur",
    CLIENT: "/portail-client",
    STAGIAIRE: "/portail-stagiaire",
  };

  redirect(redirectMap[user?.role ?? ""] ?? "/connexion");
}
