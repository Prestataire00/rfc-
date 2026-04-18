import { prisma } from "@/lib/prisma";

export async function createNotification(data: {
  userId: string;
  titre: string;
  message: string;
  type?: "info" | "warning" | "success" | "error";
  lien?: string;
}) {
  return prisma.notification.create({ data });
}

export async function notifyAllAdmins(data: {
  titre: string;
  message: string;
  type?: "info" | "warning" | "success" | "error";
  lien?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "admin", actif: true },
  });
  return Promise.all(
    admins.map((admin) =>
      prisma.notification.create({ data: { ...data, userId: admin.id } })
    )
  );
}

// Alias compatible avec le pattern SO SAFE
export const notifyAdmins = notifyAllAdmins;

// Notifie le formateur via son user lie
export async function notifyFormateur(formateurId: string, data: {
  titre: string;
  message: string;
  type?: "info" | "warning" | "success" | "error";
  lien?: string;
}) {
  const formateur = await prisma.formateur.findUnique({
    where: { id: formateurId },
    include: { user: true },
  });
  if (!formateur?.user) return;
  return createNotification({ ...data, userId: formateur.user.id });
}
