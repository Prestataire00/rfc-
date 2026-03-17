import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean all data in correct order
  await prisma.preuveQualiopi.deleteMany();
  await prisma.indicateurQualiopi.deleteMany();
  await prisma.feuillePresence.deleteMany();
  await prisma.attestation.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.feedbackFormateur.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.document.deleteMany();
  await prisma.inscription.deleteMany();
  await prisma.ligneDevis.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.besoinFormation.deleteMany();
  await prisma.devis.deleteMany();
  await prisma.financement.deleteMany();
  await prisma.session.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.formateur.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.entreprise.deleteMany();

  const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);

  // === ENTREPRISES ===
  const techCorp = await prisma.entreprise.create({
    data: {
      nom: "TechCorp Solutions",
      secteur: "Informatique",
      adresse: "45 Avenue de l'Innovation",
      ville: "Paris",
      codePostal: "75008",
      siret: "12345678901234",
      email: "contact@techcorp.fr",
      telephone: "01 23 45 67 89",
    },
  });

  const greenEnergy = await prisma.entreprise.create({
    data: {
      nom: "GreenEnergy SA",
      secteur: "Energie",
      adresse: "12 Rue du Developpement Durable",
      ville: "Lyon",
      codePostal: "69003",
      siret: "98765432109876",
      email: "rh@greenenergy.fr",
      telephone: "04 56 78 90 12",
    },
  });

  const mediaSoft = await prisma.entreprise.create({
    data: {
      nom: "MediaSoft",
      secteur: "Communication",
      adresse: "8 Boulevard des Medias",
      ville: "Bordeaux",
      codePostal: "33000",
      siret: "45678901234567",
      email: "formation@mediasoft.fr",
      telephone: "05 67 89 01 23",
    },
  });

  // === FORMATEURS ===
  const formateur1 = await prisma.formateur.create({
    data: {
      nom: "Dupont",
      prenom: "Marie",
      email: "marie.dupont@formateurs.fr",
      telephone: "06 11 22 33 44",
      specialites: JSON.stringify(["Management", "Leadership", "Communication"]),
      tarifJournalier: 450,
      actif: true,
    },
  });

  const formateur2 = await prisma.formateur.create({
    data: {
      nom: "Martin",
      prenom: "Jean",
      email: "jean.martin@formateurs.fr",
      telephone: "06 55 66 77 88",
      specialites: JSON.stringify(["Excel", "Power BI", "Bureautique"]),
      tarifJournalier: 400,
      actif: true,
    },
  });

  const formateur3 = await prisma.formateur.create({
    data: {
      nom: "Bernard",
      prenom: "Sophie",
      email: "sophie.bernard@formateurs.fr",
      telephone: "06 99 88 77 66",
      specialites: JSON.stringify(["Securite", "RGPD", "Cybersecurite"]),
      tarifJournalier: 500,
      actif: true,
    },
  });

  // === CONTACTS (Stagiaires & Clients) ===
  const contacts = await Promise.all([
    prisma.contact.create({ data: { nom: "Leroy", prenom: "Pierre", email: "p.leroy@techcorp.fr", telephone: "06 12 34 56 78", poste: "Developpeur", type: "stagiaire", entrepriseId: techCorp.id } }),
    prisma.contact.create({ data: { nom: "Moreau", prenom: "Claire", email: "c.moreau@techcorp.fr", telephone: "06 23 45 67 89", poste: "Chef de projet", type: "stagiaire", entrepriseId: techCorp.id } }),
    prisma.contact.create({ data: { nom: "Robert", prenom: "Thomas", email: "t.robert@techcorp.fr", telephone: "06 34 56 78 90", poste: "Designer UX", type: "stagiaire", entrepriseId: techCorp.id } }),
    prisma.contact.create({ data: { nom: "Petit", prenom: "Julie", email: "j.petit@greenenergy.fr", telephone: "06 45 67 89 01", poste: "Ingenieur", type: "stagiaire", entrepriseId: greenEnergy.id } }),
    prisma.contact.create({ data: { nom: "Roux", prenom: "Antoine", email: "a.roux@greenenergy.fr", telephone: "06 56 78 90 12", poste: "Technicien", type: "stagiaire", entrepriseId: greenEnergy.id } }),
    prisma.contact.create({ data: { nom: "Fournier", prenom: "Emma", email: "e.fournier@mediasoft.fr", telephone: "06 67 89 01 23", poste: "Community Manager", type: "stagiaire", entrepriseId: mediaSoft.id } }),
    prisma.contact.create({ data: { nom: "Garcia", prenom: "Lucas", email: "l.garcia@mediasoft.fr", telephone: "06 78 90 12 34", poste: "Graphiste", type: "stagiaire", entrepriseId: mediaSoft.id } }),
    prisma.contact.create({ data: { nom: "Durand", prenom: "Sophie", email: "s.durand@techcorp.fr", telephone: "06 89 01 23 45", poste: "RH Manager", type: "client", entrepriseId: techCorp.id } }),
  ]);

  // === USERS ===
  await prisma.user.create({
    data: {
      email: "admin@formapro.fr",
      password: hash("admin123"),
      nom: "Admin",
      prenom: "FormaPro",
      role: "admin",
    },
  });

  await prisma.user.create({
    data: {
      email: "formateur@formapro.fr",
      password: hash("formateur123"),
      nom: "Dupont",
      prenom: "Marie",
      role: "formateur",
      formateurId: formateur1.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "client@formapro.fr",
      password: hash("client123"),
      nom: "Durand",
      prenom: "Sophie",
      role: "client",
      entrepriseId: techCorp.id,
    },
  });

  // === FORMATIONS ===
  const formations = await Promise.all([
    prisma.formation.create({
      data: {
        titre: "Management d'equipe",
        description: "Developper ses competences manageriales et son leadership",
        duree: 14,
        tarif: 2800,
        niveau: "intermediaire",
        categorie: "Management",
        objectifs: "Motiver son equipe, gerer les conflits, deleguer efficacement",
        certifiante: true,
        codeRNCP: "RNCP35585",
      },
    }),
    prisma.formation.create({
      data: {
        titre: "Excel Avance et Power BI",
        description: "Maitriser les fonctions avancees d'Excel et l'analyse de donnees avec Power BI",
        duree: 21,
        tarif: 3500,
        niveau: "avance",
        categorie: "Bureautique",
        objectifs: "TCD, macros VBA, dashboards Power BI",
      },
    }),
    prisma.formation.create({
      data: {
        titre: "Cybersecurite et RGPD",
        description: "Sensibilisation a la securite informatique et mise en conformite RGPD",
        duree: 7,
        tarif: 1500,
        niveau: "tous",
        categorie: "Securite",
        objectifs: "Identifier les menaces, appliquer les bonnes pratiques, conformite RGPD",
        certifiante: true,
        codeRNCP: "RNCP36399",
      },
    }),
    prisma.formation.create({
      data: {
        titre: "Communication professionnelle",
        description: "Ameliorer sa communication orale et ecrite en contexte professionnel",
        duree: 14,
        tarif: 2200,
        niveau: "debutant",
        categorie: "Communication",
        objectifs: "Prise de parole, redaction professionnelle, gestion des emotions",
      },
    }),
    prisma.formation.create({
      data: {
        titre: "Gestion de projet Agile",
        description: "Maitriser les methodologies Agile (Scrum, Kanban) pour la gestion de projet",
        duree: 14,
        tarif: 2600,
        niveau: "intermediaire",
        categorie: "Management",
        objectifs: "Scrum Master, Sprint Planning, Retrospectives",
        certifiante: true,
      },
    }),
  ]);

  // === SESSIONS ===
  const now = new Date();
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
  const nextMonth = new Date(now); nextMonth.setMonth(now.getMonth() + 1);
  const lastMonth = new Date(now); lastMonth.setMonth(now.getMonth() - 1);
  const twoMonthsAgo = new Date(now); twoMonthsAgo.setMonth(now.getMonth() - 2);

  const session1 = await prisma.session.create({
    data: {
      formationId: formations[0].id,
      formateurId: formateur1.id,
      dateDebut: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 9, 0),
      dateFin: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 1, 17, 0),
      lieu: "Paris - Salle A",
      statut: "confirmee",
      capaciteMax: 12,
      coutFormateur: 900,
    },
  });

  const session2 = await prisma.session.create({
    data: {
      formationId: formations[1].id,
      formateurId: formateur2.id,
      dateDebut: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 9, 0),
      dateFin: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 17, 17, 0),
      lieu: "Lyon - Centre de formation",
      statut: "planifiee",
      capaciteMax: 8,
      coutFormateur: 1200,
    },
  });

  const session3 = await prisma.session.create({
    data: {
      formationId: formations[2].id,
      formateurId: formateur3.id,
      dateDebut: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 10, 9, 0),
      dateFin: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 10, 17, 0),
      lieu: "Paris - Salle B",
      statut: "terminee",
      capaciteMax: 15,
      coutFormateur: 500,
    },
  });

  const session4 = await prisma.session.create({
    data: {
      formationId: formations[3].id,
      formateurId: formateur1.id,
      dateDebut: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 5, 9, 0),
      dateFin: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 6, 17, 0),
      lieu: "Bordeaux",
      statut: "terminee",
      capaciteMax: 10,
      coutFormateur: 900,
    },
  });

  const sessionToday = await prisma.session.create({
    data: {
      formationId: formations[4].id,
      formateurId: formateur1.id,
      dateDebut: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
      dateFin: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 0),
      lieu: "Paris - Salle C",
      statut: "en_cours",
      capaciteMax: 10,
      coutFormateur: 900,
    },
  });

  // === INSCRIPTIONS ===
  await Promise.all([
    prisma.inscription.create({ data: { contactId: contacts[0].id, sessionId: session1.id, statut: "confirmee" } }),
    prisma.inscription.create({ data: { contactId: contacts[1].id, sessionId: session1.id, statut: "confirmee" } }),
    prisma.inscription.create({ data: { contactId: contacts[3].id, sessionId: session1.id, statut: "en_attente" } }),
    prisma.inscription.create({ data: { contactId: contacts[4].id, sessionId: session2.id, statut: "confirmee" } }),
    prisma.inscription.create({ data: { contactId: contacts[5].id, sessionId: session2.id, statut: "en_attente" } }),
    prisma.inscription.create({ data: { contactId: contacts[0].id, sessionId: session3.id, statut: "presente" } }),
    prisma.inscription.create({ data: { contactId: contacts[1].id, sessionId: session3.id, statut: "presente" } }),
    prisma.inscription.create({ data: { contactId: contacts[2].id, sessionId: session3.id, statut: "presente" } }),
    prisma.inscription.create({ data: { contactId: contacts[3].id, sessionId: session3.id, statut: "presente" } }),
    prisma.inscription.create({ data: { contactId: contacts[4].id, sessionId: session3.id, statut: "absente" } }),
    prisma.inscription.create({ data: { contactId: contacts[5].id, sessionId: session4.id, statut: "presente" } }),
    prisma.inscription.create({ data: { contactId: contacts[6].id, sessionId: session4.id, statut: "presente" } }),
    prisma.inscription.create({ data: { contactId: contacts[0].id, sessionId: sessionToday.id, statut: "confirmee" } }),
    prisma.inscription.create({ data: { contactId: contacts[1].id, sessionId: sessionToday.id, statut: "confirmee" } }),
  ]);

  // === DEVIS ===
  const devis1 = await prisma.devis.create({
    data: {
      numero: "DEV-2026-001",
      objet: "Formation Management d'equipe - TechCorp",
      montantHT: 2800,
      montantTTC: 3360,
      dateValidite: new Date(now.getFullYear(), now.getMonth() + 2, 1),
      statut: "signe",
      dateSigne: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      entrepriseId: techCorp.id,
      contactId: contacts[7].id,
      lignes: {
        create: [
          { designation: "Formation Management d'equipe (14h)", quantite: 1, prixUnitaire: 2800, montant: 2800 },
        ],
      },
    },
  });

  const devis2 = await prisma.devis.create({
    data: {
      numero: "DEV-2026-002",
      objet: "Formation Excel Avance - GreenEnergy",
      montantHT: 3500,
      montantTTC: 4200,
      dateValidite: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      statut: "envoye",
      entrepriseId: greenEnergy.id,
      lignes: {
        create: [
          { designation: "Formation Excel Avance et Power BI (21h)", quantite: 1, prixUnitaire: 3500, montant: 3500 },
        ],
      },
    },
  });

  await prisma.devis.create({
    data: {
      numero: "DEV-2026-003",
      objet: "Formation Cybersecurite - MediaSoft",
      montantHT: 4500,
      montantTTC: 5400,
      dateValidite: new Date(now.getFullYear(), now.getMonth() + 1, 30),
      statut: "brouillon",
      entrepriseId: mediaSoft.id,
      lignes: {
        create: [
          { designation: "Formation Cybersecurite et RGPD (7h)", quantite: 3, prixUnitaire: 1500, montant: 4500 },
        ],
      },
    },
  });

  // === FACTURES ===
  await prisma.facture.create({
    data: {
      numero: "FAC-2026-001",
      montantHT: 2800,
      montantTTC: 3360,
      dateEcheance: new Date(now.getFullYear(), now.getMonth(), 28),
      statut: "payee",
      datePaiement: new Date(now.getFullYear(), now.getMonth(), 20),
      devisId: devis1.id,
      entrepriseId: techCorp.id,
    },
  });

  await prisma.facture.create({
    data: {
      numero: "FAC-2026-002",
      montantHT: 1500,
      montantTTC: 1800,
      dateEcheance: new Date(now.getFullYear(), now.getMonth() - 1, 28),
      statut: "payee",
      datePaiement: new Date(now.getFullYear(), now.getMonth() - 1, 25),
      entrepriseId: greenEnergy.id,
    },
  });

  // === BESOINS ===
  await prisma.besoinFormation.create({
    data: {
      titre: "Formation Python pour l'equipe data",
      description: "L'equipe data souhaite monter en competences sur Python et les librairies d'analyse de donnees",
      origine: "client",
      statut: "nouveau",
      priorite: "haute",
      nbStagiaires: 5,
      budget: 6000,
      datesSouhaitees: "Avril-Mai 2026",
      entrepriseId: techCorp.id,
    },
  });

  await prisma.besoinFormation.create({
    data: {
      titre: "Sensibilisation RGPD obligatoire",
      description: "Mise a jour annuelle obligatoire sur la protection des donnees",
      origine: "centre",
      statut: "qualifie",
      priorite: "urgente",
      nbStagiaires: 20,
      formationId: formations[2].id,
      entrepriseId: greenEnergy.id,
    },
  });

  await prisma.besoinFormation.create({
    data: {
      titre: "Communication digitale",
      description: "Formation reseaux sociaux et strategie de contenu",
      origine: "client",
      statut: "devis_envoye",
      priorite: "normale",
      nbStagiaires: 3,
      budget: 4000,
      entrepriseId: mediaSoft.id,
      devisId: devis2.id,
    },
  });

  // === DISPONIBILITES ===
  await Promise.all([
    prisma.disponibilite.create({
      data: {
        formateurId: formateur1.id,
        dateDebut: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        dateFin: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
        type: "disponible",
        notes: "Disponible toute la semaine",
      },
    }),
    prisma.disponibilite.create({
      data: {
        formateurId: formateur1.id,
        dateDebut: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        dateFin: new Date(now.getFullYear(), now.getMonth() + 1, 3),
        type: "indisponible",
        notes: "Conge personnel",
      },
    }),
    prisma.disponibilite.create({
      data: {
        formateurId: formateur2.id,
        dateDebut: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
        dateFin: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14),
        type: "disponible",
      },
    }),
  ]);

  // === DOCUMENTS ===
  await Promise.all([
    prisma.document.create({
      data: { nom: "Convention TechCorp - Management", type: "convention", chemin: "/documents/conv-techcorp-mgmt.pdf", sessionId: session1.id, entrepriseId: techCorp.id },
    }),
    prisma.document.create({
      data: { nom: "Feuille de presence - Cybersecurite", type: "feuille_presence", chemin: "/documents/fp-cyber.pdf", sessionId: session3.id, entrepriseId: techCorp.id },
    }),
    prisma.document.create({
      data: { nom: "Contrat sous-traitance - M. Dupont", type: "contrat", chemin: "/documents/contrat-dupont.pdf", formateurId: formateur1.id },
    }),
    prisma.document.create({
      data: { nom: "Convention GreenEnergy - Excel", type: "convention", chemin: "/documents/conv-green-excel.pdf", sessionId: session2.id, entrepriseId: greenEnergy.id },
    }),
    prisma.document.create({
      data: { nom: "Attestation TechCorp", type: "attestation", chemin: "/documents/att-techcorp.pdf", entrepriseId: techCorp.id },
    }),
  ]);

  // === EVALUATIONS ===
  await Promise.all([
    prisma.evaluation.create({
      data: {
        type: "satisfaction_chaud", cible: "stagiaire", sessionId: session3.id, contactId: contacts[0].id,
        noteGlobale: 5, commentaire: "Excellente formation, tres pratique et bien animee", estComplete: true,
        reponses: JSON.stringify({ contenu: 5, pedagogie: 5, supports: 4, rythme: 5 }),
      },
    }),
    prisma.evaluation.create({
      data: {
        type: "satisfaction_chaud", cible: "stagiaire", sessionId: session3.id, contactId: contacts[1].id,
        noteGlobale: 4, commentaire: "Bonne formation, quelques points a approfondir", estComplete: true,
        reponses: JSON.stringify({ contenu: 4, pedagogie: 5, supports: 3, rythme: 4 }),
      },
    }),
    prisma.evaluation.create({
      data: {
        type: "satisfaction_chaud", cible: "stagiaire", sessionId: session4.id, contactId: contacts[5].id,
        noteGlobale: 4, estComplete: true, reponses: JSON.stringify({ contenu: 4, pedagogie: 4, supports: 4, rythme: 4 }),
      },
    }),
    prisma.evaluation.create({
      data: { type: "satisfaction_froid", cible: "client", sessionId: session3.id, contactId: contacts[7].id, estComplete: false },
    }),
  ]);

  // === ATTESTATIONS ===
  await Promise.all([
    prisma.attestation.create({ data: { sessionId: session3.id, contactId: contacts[0].id, type: "fin_formation", statut: "validee", dateValidation: new Date() } }),
    prisma.attestation.create({ data: { sessionId: session3.id, contactId: contacts[1].id, type: "fin_formation", statut: "validee", dateValidation: new Date() } }),
    prisma.attestation.create({ data: { sessionId: session3.id, contactId: contacts[2].id, type: "fin_formation", statut: "generee" } }),
    prisma.attestation.create({ data: { sessionId: session4.id, contactId: contacts[5].id, type: "fin_formation", statut: "validee", dateValidation: new Date() } }),
  ]);

  // === FEEDBACKS ===
  await prisma.feedbackFormateur.create({
    data: {
      formateurId: formateur3.id, sessionId: session3.id, noteGlobale: 4,
      commentaire: "Groupe tres motive et participatif",
      conditionsMat: "Salle bien equipee, videoprojecteur de qualite",
      dynamiqueGroupe: "Tres bonne dynamique, echanges riches",
      suggestions: "Prevoir plus de temps pour les exercices pratiques",
    },
  });

  await prisma.feedbackFormateur.create({
    data: {
      formateurId: formateur1.id, sessionId: session4.id, noteGlobale: 3,
      commentaire: "Formation qui s'est bien deroulee dans l'ensemble",
      conditionsMat: "Salle un peu petite, climatisation bruyante",
      dynamiqueGroupe: "Groupe heterogene en termes de niveau",
    },
  });

  // === FINANCEMENTS ===
  await Promise.all([
    prisma.financement.create({ data: { type: "opco", organisme: "OPCO Atlas", montant: 2800, reference: "OPCO-2026-4521", statut: "accorde", entrepriseId: techCorp.id } }),
    prisma.financement.create({ data: { type: "entreprise", montant: 1500, statut: "accorde", entrepriseId: greenEnergy.id } }),
    prisma.financement.create({ data: { type: "cpf", montant: 2200, reference: "CPF-2026-8877", statut: "en_cours" } }),
  ]);

  // === QUALIOPI INDICATEURS ===
  const qualiopiIndicateurs = [
    // Critère 1 : Information du public (indicateurs 1-4)
    { numero: 1, critere: 1, libelle: "Diffusion d'une information accessible sur les prestations, les resultats obtenus et les tarifs", preuvesAttendues: "Catalogue, site internet, CGV, plaquettes commerciales", statut: "conforme" },
    { numero: 2, critere: 1, libelle: "Diffusion d'indicateurs de resultats adaptes a la nature des prestations et aux publics accueillis", preuvesAttendues: "Taux de satisfaction, taux de reussite, taux d'insertion", statut: "en_cours" },
    { numero: 3, critere: 1, libelle: "Obtention des certifications et labels de qualite", preuvesAttendues: "Certificats, labels, habilitations", statut: "non_conforme" },
    { numero: 4, critere: 1, libelle: "Analyse des besoins du beneficiaire par le prestataire en lien avec le financeur", preuvesAttendues: "Questionnaires de positionnement, entretiens prealables", statut: "conforme" },

    // Critère 2 : Objectifs et adaptation (indicateurs 5-8)
    { numero: 5, critere: 2, libelle: "Definition des objectifs operationnels et evaluables de la prestation", preuvesAttendues: "Programmes de formation, fiches pedagogiques", statut: "conforme" },
    { numero: 6, critere: 2, libelle: "Etablissement des contenus et modalites de la prestation", preuvesAttendues: "Programmes detailles, plannings, supports pedagogiques", statut: "conforme" },
    { numero: 7, critere: 2, libelle: "Adequation des contenus aux exigences de la certification visee", preuvesAttendues: "Referentiels de certification, grilles de correspondance", statut: "en_cours" },
    { numero: 8, critere: 2, libelle: "Procedures de positionnement et d'evaluation des acquis a l'entree", preuvesAttendues: "Tests de positionnement, grilles d'evaluation initiale", statut: "non_conforme" },

    // Critère 3 : Moyens pédagogiques (indicateurs 9-16)
    { numero: 9, critere: 3, libelle: "Information des publics sur les conditions de deroulement de la prestation", preuvesAttendues: "Convocations, livret d'accueil, reglement interieur", statut: "conforme" },
    { numero: 10, critere: 3, libelle: "Adaptation de la prestation et des modalites d'accueil et d'accompagnement", preuvesAttendues: "Procedures d'accueil PSH, adaptations pedagogiques", statut: "en_cours" },
    { numero: 11, critere: 3, libelle: "Evaluation de l'atteinte des objectifs par les beneficiaires", preuvesAttendues: "Evaluations de fin de formation, QCM, mises en situation", statut: "conforme" },
    { numero: 12, critere: 3, libelle: "Engagement des beneficiaires et prevention des abandons", preuvesAttendues: "Suivi des absences, relances, entretiens individuels", statut: "non_conforme" },
    { numero: 13, critere: 3, libelle: "Coordination des apprentissages avec les entreprises", preuvesAttendues: "Conventions de stage, livrets de suivi en entreprise", statut: "non_applicable" },
    { numero: 14, critere: 3, libelle: "Mise en oeuvre de procedure d'alternance avec les entreprises", preuvesAttendues: "Planning d'alternance, suivi tutoral", statut: "non_applicable" },
    { numero: 15, critere: 3, libelle: "Realisation d'un bilan et suivi des parcours de formation", preuvesAttendues: "Bilans de formation, attestations de fin de formation", statut: "en_cours" },
    { numero: 16, critere: 3, libelle: "Mise en oeuvre de mesures pour favoriser l'engagement et prevenir les ruptures de parcours", preuvesAttendues: "Procedures de suivi, accompagnement individuel", statut: "non_conforme" },

    // Critère 4 : Moyens humains (indicateurs 17-20)
    { numero: 17, critere: 4, libelle: "Adequation des moyens humains, techniques et pedagogiques", preuvesAttendues: "CV des formateurs, inventaire du materiel, salles", statut: "conforme" },
    { numero: 18, critere: 4, libelle: "Mobilisation et coordination des differents intervenants", preuvesAttendues: "Organigramme, fiches de poste, reunions de coordination", statut: "conforme" },
    { numero: 19, critere: 4, libelle: "Mise a disposition de ressources pedagogiques au beneficiaire", preuvesAttendues: "Supports de cours, bibliotheque, plateforme e-learning", statut: "en_cours" },
    { numero: 20, critere: 4, libelle: "Mise en place de personnel dedie a la mobilite internationale", preuvesAttendues: "Procedures mobilite, referent international", statut: "non_applicable" },

    // Critère 5 : Satisfaction et amélioration (indicateurs 21-23)
    { numero: 21, critere: 5, libelle: "Definition et mise en oeuvre d'une demarche d'amelioration continue", preuvesAttendues: "Plan d'amelioration, revue de direction, indicateurs qualite", statut: "en_cours" },
    { numero: 22, critere: 5, libelle: "Realisation d'evaluations conformes aux exigences des certifications", preuvesAttendues: "Procedures d'evaluation, jurys, PV de deliberation", statut: "non_conforme" },
    { numero: 23, critere: 5, libelle: "Veille sur les evolutions des competences, metiers et emplois", preuvesAttendues: "Veille sectorielle, participation a des conferences, abonnements", statut: "conforme" },

    // Critère 6 : Environnement professionnel (indicateurs 24-27)
    { numero: 24, critere: 6, libelle: "Veille legale et reglementaire sur la formation professionnelle", preuvesAttendues: "Abonnements juridiques, notes de veille, mises a jour des procedures", statut: "conforme" },
    { numero: 25, critere: 6, libelle: "Veille sur les innovations pedagogiques et technologiques", preuvesAttendues: "Participation a des salons, benchmarks, experimentation d'outils", statut: "en_cours" },
    { numero: 26, critere: 6, libelle: "Mobilisation d'expertises et de ressources externes", preuvesAttendues: "Partenariats, conventions, intervenants externes", statut: "conforme" },
    { numero: 27, critere: 6, libelle: "Conformite reglementaire en matiere d'accessibilite handicap", preuvesAttendues: "Referent handicap, procedure d'accueil, partenariats specialises", statut: "non_conforme" },

    // Critère 7 : Processus de certification (indicateurs 28-32)
    { numero: 28, critere: 7, libelle: "Recueil des appreciations des parties prenantes", preuvesAttendues: "Questionnaires de satisfaction, bilans de formation", statut: "conforme" },
    { numero: 29, critere: 7, libelle: "Traitement des reclamations et des difficultes rencontrees", preuvesAttendues: "Registre de reclamations, procedures de traitement, suivi des actions", statut: "en_cours" },
    { numero: 30, critere: 7, libelle: "Mise en oeuvre de mesures d'amelioration a partir des appreciations recueillies", preuvesAttendues: "Plans d'action, comptes rendus de revue, indicateurs d'amelioration", statut: "non_conforme" },
    { numero: 31, critere: 7, libelle: "Realisation d'actions d'amelioration continue", preuvesAttendues: "Revue annuelle, tableau de bord qualite, actions correctives", statut: "en_cours" },
    { numero: 32, critere: 7, libelle: "Organisation de la veille sur les evolutions des certifications et habilitations", preuvesAttendues: "Suivi des renouvellements, veille France Competences", statut: "non_conforme" },
  ];

  for (const ind of qualiopiIndicateurs) {
    await prisma.indicateurQualiopi.create({
      data: {
        numero: ind.numero,
        critere: ind.critere,
        libelle: ind.libelle,
        preuvesAttendues: ind.preuvesAttendues,
        statut: ind.statut,
        prioritaire: ind.statut === "non_conforme",
      },
    });
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
