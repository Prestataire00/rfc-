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

    const { nom, prenom, email, telephone, entreprise } = await req.json();

    if (!nom || !prenom || !email) {
      return NextResponse.json({ error: "Nom, prenom et email requis" }, { status: 400 });
    }

    // Find or create contact
    let contact = await prisma.contact.findFirst({ where: { email } });

    if (!contact) {
      // Find or create entreprise if provided
      let entrepriseId = null;
      if (entreprise) {
        let ent = await prisma.entreprise.findFirst({ where: { nom: entreprise } });
        if (!ent) {
          ent = await prisma.entreprise.create({ data: { nom: entreprise } });
        }
        entrepriseId = ent.id;
      }

      contact = await prisma.contact.create({
        data: {
          nom,
          prenom,
          email,
          telephone: telephone || null,
          entrepriseId,
          type: "stagiaire",
        },
      });
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
