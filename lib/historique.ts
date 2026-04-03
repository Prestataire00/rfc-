import { prisma } from "@/lib/prisma";

type ActionData = {
  action: string;
  label: string;
  detail?: string;
  lien?: string;
  userId?: string;
  entrepriseId?: string;
  contactId?: string;
  sessionId?: string;
  devisId?: string;
  factureId?: string;
};

export async function logAction(data: ActionData) {
  try {
    return await prisma.historiqueAction.create({ data });
  } catch (e) {
    console.error("Erreur log action:", e);
  }
}
