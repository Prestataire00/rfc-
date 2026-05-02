export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/client/recyclages
// Liste les certifications des salaries de l'entreprise avec statut de recyclage.
// Inclut les certifications proches de l'expiration (J-60, J-30).
export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "client" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const entrepriseId = session.user.entrepriseId;
  if (!entrepriseId) return NextResponse.json([]);

  // Recuperer les contacts de l'entreprise
  const contacts = await prisma.contact.findMany({
    where: { entrepriseId },
    select: { id: true, nom: true, prenom: true, email: true },
  });
  const contactIds = contacts.map((c) => c.id);

  // Chercher les certifications existantes
  const certifications = await prisma.certificationStagiaire.findMany({
    where: { contactId: { in: contactIds } },
    include: {
      contact: { select: { id: true, nom: true, prenom: true, email: true } },
      formation: { select: { id: true, titre: true, dureeRecyclage: true, categorie: true } },
    },
    orderBy: { dateExpiration: "asc" },
  });

  // Calculer aussi les formations terminees sans certification explicite
  // (pour les cas ou CertificationStagiaire n'a pas ete cree manuellement)
  const sessionsTerminees = await prisma.session.findMany({
    where: {
      statut: "terminee",
      formation: { certifiante: true, dureeRecyclage: { not: null } },
      inscriptions: {
        some: { contactId: { in: contactIds }, statut: { in: ["presente", "confirmee"] } },
      },
    },
    include: {
      formation: { select: { id: true, titre: true, dureeRecyclage: true, categorie: true } },
      inscriptions: {
        where: { contactId: { in: contactIds }, statut: { in: ["presente", "confirmee"] } },
        include: { contact: { select: { id: true, nom: true, prenom: true, email: true } } },
      },
    },
  });

  // Construire la vue unifiee : certifications + sessions sans certification
  const certMap = new Set(certifications.map((c) => `${c.contactId}_${c.formationId}`));
  const implicitCerts = sessionsTerminees.flatMap((s) => {
    if (!s.formation.dureeRecyclage) return [];
    return s.inscriptions
      .filter((i) => !certMap.has(`${i.contactId}_${s.formation.id}`))
      .map((i) => {
        const dateObtention = s.dateFin;
        const dateExpiration = new Date(dateObtention);
        dateExpiration.setMonth(dateExpiration.getMonth() + (s.formation.dureeRecyclage || 24));
        const now = new Date();
        const joursRestants = Math.ceil((dateExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: `implicit_${s.id}_${i.contactId}`,
          contactId: i.contactId,
          formationId: s.formation.id,
          contact: i.contact,
          formation: s.formation,
          dateObtention: dateObtention.toISOString(),
          dateExpiration: dateExpiration.toISOString(),
          statut: joursRestants <= 0 ? "expire" : joursRestants <= 60 ? "a_recycler" : "valide",
          joursRestants,
          implicit: true,
        };
      });
  });

  const now = new Date();
  const result = [
    ...certifications.map((c) => {
      const joursRestants = c.dateExpiration
        ? Math.ceil((new Date(c.dateExpiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: c.id,
        contactId: c.contactId,
        formationId: c.formationId,
        contact: c.contact,
        formation: c.formation,
        dateObtention: c.dateObtention.toISOString(),
        dateExpiration: c.dateExpiration?.toISOString() || null,
        statut: c.statut,
        joursRestants,
        implicit: false,
      };
    }),
    ...implicitCerts,
  ];

  // Trier par date d'expiration (urgents en premier)
  result.sort((a, b) => {
    if (!a.dateExpiration) return 1;
    if (!b.dateExpiration) return -1;
    return new Date(a.dateExpiration).getTime() - new Date(b.dateExpiration).getTime();
  });

  return NextResponse.json(result);
});
