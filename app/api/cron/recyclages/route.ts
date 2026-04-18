export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";

// GET /api/cron/recyclages
// Cron quotidien : detecte les certifications expirant J-60/J-30, marque les expirees.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in60d = new Date(now); in60d.setDate(in60d.getDate() + 60);
    const in59d = new Date(now); in59d.setDate(in59d.getDate() + 59);
    const in30d = new Date(now); in30d.setDate(in30d.getDate() + 30);
    const in29d = new Date(now); in29d.setDate(in29d.getDate() + 29);

    // J-60 alertes
    const j60 = await prisma.certificationStagiaire.findMany({
      where: {
        statut: "valide",
        alerteJ60Envoyee: false,
        dateExpiration: { gte: in59d, lte: in60d },
      },
      include: { contact: true, formation: true },
    });

    for (const cert of j60) {
      triggerAutomation("recyclage_due", {
        contactId: cert.contactId,
        formationId: cert.formationId,
        meta: { daysBeforeExpiry: 60, certificationId: cert.id },
      }).catch(() => {});

      await prisma.certificationStagiaire.update({
        where: { id: cert.id },
        data: { alerteJ60Envoyee: true },
      });
    }

    // J-30 alertes
    const j30 = await prisma.certificationStagiaire.findMany({
      where: {
        statut: "valide",
        alerteJ30Envoyee: false,
        dateExpiration: { gte: in29d, lte: in30d },
      },
      include: { contact: true },
    });

    for (const cert of j30) {
      triggerAutomation("recyclage_due", {
        contactId: cert.contactId,
        formationId: cert.formationId,
        meta: { daysBeforeExpiry: 30, certificationId: cert.id },
      }).catch(() => {});

      await prisma.certificationStagiaire.update({
        where: { id: cert.id },
        data: { alerteJ30Envoyee: true },
      });
    }

    // Marquer les expirees
    const { count: nbExpired } = await prisma.certificationStagiaire.updateMany({
      where: { statut: "valide", dateExpiration: { lt: now } },
      data: { statut: "expire" },
    });

    if (nbExpired > 0) {
      notifyAdmins({
        titre: `${nbExpired} certification(s) expiree(s)`,
        message: `${nbExpired} certification(s) viennent d'expirer et necessitent un recyclage.`,
        type: "warning",
        lien: "/espace-client/recyclages",
      }).catch(() => {});
    }

    return NextResponse.json({
      alertesJ60: j60.length,
      alertesJ30: j30.length,
      expirees: nbExpired,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("Cron recyclages:", err);
    return NextResponse.json({ error: "Erreur cron recyclages" }, { status: 500 });
  }
}
