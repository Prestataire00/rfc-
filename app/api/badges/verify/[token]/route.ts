export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/badges/verify/[token] — verification publique d'un badge
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const award = await prisma.badgeAward.findUnique({
      where: { verificationToken: params.token },
      include: {
        badge: { select: { nom: true, description: true, niveau: true, couleur: true, icone: true } },
        contact: { select: { prenom: true, nom: true } },
      },
    });

    if (!award) return NextResponse.json({ error: "Badge introuvable" }, { status: 404 });

    // Recuperer la formation si le badge en a une
    const badge = await prisma.digitalBadge.findUnique({
      where: { id: award.badgeId },
      include: { formation: { select: { titre: true } } },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";
    const verifyUrl = `${baseUrl}/badges/${params.token}`;
    const linkedinUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(award.badge.nom)}&organizationName=${encodeURIComponent("RFC - Rescue Formation Conseil")}&certUrl=${encodeURIComponent(verifyUrl)}`;

    return NextResponse.json({
      badge: award.badge,
      contact: award.contact,
      formation: badge?.formation || null,
      awardedAt: award.createdAt.toISOString(),
      revoque: award.revoque,
      linkedinUrl,
    });
  } catch (err) {
    console.error("GET badges/verify:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
