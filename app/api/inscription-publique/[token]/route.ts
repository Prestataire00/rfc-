export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: session info for public form
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await prisma.session.findUnique({
      where: { tokenInscription: params.token },
      include: {
        formation: { select: { titre: true, duree: true, description: true } },
        inscriptions: { select: { id: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    const placesRestantes = session.capaciteMax - session.inscriptions.length;

    return NextResponse.json({
      formation: session.formation.titre,
      duree: session.formation.duree,
      description: session.formation.description,
      dateDebut: session.dateDebut,
      dateFin: session.dateFin,
      lieu: session.lieu,
      placesRestantes,
    });
  } catch (err: unknown) {
    console.error("Erreur recuperation session publique:", err);
    return NextResponse.json({ error: "Erreur lors de la recuperation des informations de session" }, { status: 500 });
  }
}

// POST: submit registration
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await prisma.session.findUnique({
      where: { tokenInscription: params.token },
      include: { inscriptions: { select: { id: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (session.inscriptions.length >= session.capaciteMax) {
      return NextResponse.json({ error: "Plus de places disponibles" }, { status: 400 });
    }

    const body = await req.json();
    const { nom, prenom, email, telephone, entreprise, dateNaissance, numeroSecuriteSociale, besoinsAdaptation, consentementRGPD } = body;

    if (!nom || !prenom || !email) {
      return NextResponse.json({ error: "Nom, prenom et email requis" }, { status: 400 });
    }
    if (!consentementRGPD) {
      return NextResponse.json({ error: "Le consentement RGPD est obligatoire" }, { status: 400 });
    }

    // Find or create contact (upsert pour éviter les doublons en cas de race condition)
    let entrepriseId: string | null = null;
    if (entreprise) {
      let ent = await prisma.entreprise.findFirst({ where: { nom: entreprise } });
      if (!ent) {
        try {
          ent = await prisma.entreprise.create({ data: { nom: entreprise } });
        } catch {
          // Race condition : une autre requête a créé l'entreprise entre temps
          ent = await prisma.entreprise.findFirst({ where: { nom: entreprise } });
        }
      }
      entrepriseId = ent?.id ?? null;
    }

    const contactExtraData: Record<string, unknown> = {};
    if (dateNaissance) {
      const d = new Date(dateNaissance);
      if (!isNaN(d.getTime())) contactExtraData.dateNaissance = d;
    }
    if (numeroSecuriteSociale) contactExtraData.numeroSecuriteSociale = String(numeroSecuriteSociale).replace(/\s/g, "");
    if (besoinsAdaptation) contactExtraData.besoinsAdaptation = besoinsAdaptation;

    let contact = await prisma.contact.findFirst({ where: { email } });
    if (!contact) {
      try {
        contact = await prisma.contact.create({
          data: {
            nom,
            prenom,
            email,
            telephone: telephone || null,
            entrepriseId,
            type: "stagiaire",
            ...contactExtraData,
          },
        });
      } catch {
        // Race condition : email déjà créé par une autre requête simultanée
        contact = await prisma.contact.findFirst({ where: { email } });
        if (!contact) {
          return NextResponse.json({ error: "Erreur lors de la création du contact" }, { status: 500 });
        }
      }
    } else if (Object.keys(contactExtraData).length > 0) {
      // Mise a jour des donnees legales si fournies et manquantes
      const updateData: Record<string, unknown> = {};
      if (contactExtraData.dateNaissance && !contact.dateNaissance) updateData.dateNaissance = contactExtraData.dateNaissance;
      if (contactExtraData.numeroSecuriteSociale && !contact.numeroSecuriteSociale) updateData.numeroSecuriteSociale = contactExtraData.numeroSecuriteSociale;
      if (contactExtraData.besoinsAdaptation && !contact.besoinsAdaptation) updateData.besoinsAdaptation = contactExtraData.besoinsAdaptation;
      if (Object.keys(updateData).length > 0) {
        await prisma.contact.update({ where: { id: contact.id }, data: updateData }).catch(() => {});
      }
    }

    // Check if already inscribed
    const existing = await prisma.inscription.findFirst({
      where: { sessionId: session.id, contactId: contact.id },
    });

    if (existing) {
      return NextResponse.json({ error: "Vous etes deja inscrit a cette session" }, { status: 409 });
    }

    await prisma.inscription.create({
      data: {
        sessionId: session.id,
        contactId: contact.id,
        statut: "en_attente",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur inscription publique:", err);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
