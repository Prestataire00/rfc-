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
