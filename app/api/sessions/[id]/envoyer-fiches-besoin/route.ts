export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, ficheBesoinClientEmail, ficheBesoinStagiaireEmail } from "@/lib/email";

// POST /api/sessions/[id]/envoyer-fiches-besoin
// Cree (ou reutilise) la fiche besoin client + les fiches besoin stagiaires pour tous les inscrits,
// et envoie les emails.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      include: {
        formation: true,
        devis: { include: { entreprise: true, contact: true } },
        inscriptions: {
          where: { statut: { in: ["confirmee", "en_attente"] } },
          include: { contact: true },
        },
      },
    });
    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const optionnel = session.modeExpress;

    // 1. Fiche besoin client
    const entreprise = session.devis?.entreprise || null;
    const destinataireContact = session.devis?.contact || null;
    const destinataireEmail = destinataireContact?.email || entreprise?.email || "";
    const destinataireNom = destinataireContact
      ? `${destinataireContact.prenom} ${destinataireContact.nom}`
      : entreprise?.nom || "";

    let ficheClient = await prisma.besoinClient.findFirst({ where: { sessionId: session.id } });
    if (!ficheClient) {
      ficheClient = await prisma.besoinClient.create({
        data: {
          sessionId: session.id,
          entrepriseId: entreprise?.id ?? null,
          tokenAcces: randomBytes(24).toString("hex"),
          statut: "en_attente",
          optionnel,
          destinataireNom,
          destinataireEmail,
          secteurActivite: entreprise?.secteur ?? null,
          effectifTotal: entreprise?.effectif ?? null,
        },
      });
    }

    let clientEnvoye = false;
    if (destinataireEmail) {
      const mail = ficheBesoinClientEmail({
        destinataireNom: destinataireNom || entreprise?.nom || "",
        entreprise: { nom: entreprise?.nom || "" },
        formation: { titre: session.formation.titre },
        session: { dateDebut: session.dateDebut.toISOString() },
        link: `${baseUrl}/fiche-besoin-client/${ficheClient.tokenAcces}`,
        optionnel,
      });
      const res = await sendEmail({ to: destinataireEmail, subject: mail.subject, html: mail.html });
      clientEnvoye = !res.skipped;
      if (clientEnvoye && ficheClient.statut === "en_attente") {
        ficheClient = await prisma.besoinClient.update({
          where: { id: ficheClient.id },
          data: { statut: "envoye", dateEnvoi: new Date() },
        });
      }
    }

    // 2. Fiches besoin stagiaires
    const resultatsStagiaires: { contactId: string; envoye: boolean; erreur?: string }[] = [];
    for (const ins of session.inscriptions) {
      const contact = ins.contact;
      if (!contact) continue;

      let fiche = await prisma.besoinStagiaire.findUnique({
        where: { sessionId_contactId: { sessionId: session.id, contactId: contact.id } },
      });
      if (!fiche) {
        fiche = await prisma.besoinStagiaire.create({
          data: {
            sessionId: session.id,
            contactId: contact.id,
            tokenAcces: randomBytes(24).toString("hex"),
            statut: "en_attente",
            optionnel,
          },
        });
      }

      if (!contact.email) {
        resultatsStagiaires.push({ contactId: contact.id, envoye: false, erreur: "email manquant" });
        continue;
      }

      const mail = ficheBesoinStagiaireEmail({
        stagiaire: { prenom: contact.prenom, nom: contact.nom },
        formation: { titre: session.formation.titre },
        session: { dateDebut: session.dateDebut.toISOString() },
        link: `${baseUrl}/fiche-besoin-stagiaire/${fiche.tokenAcces}`,
        optionnel,
      });
      const envoi = await sendEmail({ to: contact.email, subject: mail.subject, html: mail.html });
      if (!envoi.skipped && fiche.statut === "en_attente") {
        fiche = await prisma.besoinStagiaire.update({
          where: { id: fiche.id },
          data: { statut: "envoye", dateEnvoi: new Date() },
        });
      }
      resultatsStagiaires.push({ contactId: contact.id, envoye: !envoi.skipped });
    }

    return NextResponse.json({
      ficheClient: { id: ficheClient.id, envoye: clientEnvoye },
      fichesStagiaires: resultatsStagiaires,
    });
  } catch (err: unknown) {
    console.error("envoyer-fiches-besoin error:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
