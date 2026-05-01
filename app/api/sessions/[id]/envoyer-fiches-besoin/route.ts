export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, ficheBesoinClientEmail, ficheBesoinStagiaireEmail } from "@/lib/email";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// POST /api/sessions/[id]/envoyer-fiches-besoin
// Body optionnel: { destinataireEmail?, destinataireNom?, entrepriseId? }
// Cree (ou reutilise) la fiche besoin client + les fiches besoin stagiaires pour tous les inscrits,
// et envoie les emails. Peut fonctionner sans devis si un destinataireEmail est fourni.
// Note : on NE wrap PAS dans une transaction car l'envoi d'emails ne doit pas s'executer dans une tx ;
// les fiches sont creees individuellement de maniere idempotente (findUnique/findFirst + create).
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json().catch(() => ({}));
  const overrideEmail = (body.destinataireEmail as string) || "";
  const overrideNom = (body.destinataireNom as string) || "";
  const overrideEntrepriseId = (body.entrepriseId as string) || "";

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      formation: true,
      devis: { include: { entreprise: true, contact: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "en_attente", "presente"] } },
        include: { contact: { include: { entreprise: true } } },
      },
    },
  });
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const optionnel = session.modeExpress || false;
  const warnings: string[] = [];

  // 1. Fiche besoin client — source : override body > devis > premiere entreprise d'un inscrit
  let entreprise = session.devis?.entreprise || null;
  const destinataireContact = session.devis?.contact || null;

  // Si override entreprise fourni
  if (overrideEntrepriseId && overrideEntrepriseId !== entreprise?.id) {
    const ent = await prisma.entreprise.findUnique({ where: { id: overrideEntrepriseId } });
    if (ent) entreprise = ent;
  }
  // Si pas d'entreprise via devis, chercher celle du premier inscrit
  if (!entreprise && session.inscriptions.length > 0) {
    const premiereEntreprise = session.inscriptions.find((i) => i.contact.entreprise)?.contact.entreprise;
    if (premiereEntreprise) entreprise = premiereEntreprise;
  }

  const destinataireEmail =
    overrideEmail ||
    destinataireContact?.email ||
    entreprise?.email ||
    session.inscriptions.find((i) => i.contact.email)?.contact.email || // fallback : email d'un inscrit
    "";
  const destinataireNom =
    overrideNom ||
    (destinataireContact ? `${destinataireContact.prenom} ${destinataireContact.nom}` : "") ||
    entreprise?.nom ||
    "";

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
  } else if (overrideEmail || overrideNom || overrideEntrepriseId) {
    // Mise a jour des infos destinataire si override fourni
    ficheClient = await prisma.besoinClient.update({
      where: { id: ficheClient.id },
      data: {
        ...(overrideEmail ? { destinataireEmail } : {}),
        ...(overrideNom ? { destinataireNom } : {}),
        ...(overrideEntrepriseId ? { entrepriseId: overrideEntrepriseId } : {}),
      },
    });
  }

  let clientEnvoye = false;
  if (!destinataireEmail) {
    warnings.push("Aucun email destinataire pour la fiche client (pas de devis ni d'entreprise liee). Fiche creee mais non envoyee — vous pouvez copier le lien public.");
  }
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
  if (session.inscriptions.length === 0) {
    warnings.push("Aucun inscrit sur cette session. Ajoutez des stagiaires pour envoyer les fiches individuelles.");
  }
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
    ficheClient: {
      id: ficheClient.id,
      envoye: clientEnvoye,
      tokenAcces: ficheClient.tokenAcces,
      destinataireEmail: ficheClient.destinataireEmail,
    },
    fichesStagiaires: resultatsStagiaires,
    warnings,
  });
});
