import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Organization
  const org = await prisma.organization.upsert({
    where: { siret: "12345678901234" },
    update: {},
    create: {
      name: "Entreprise Demo",
      siret: "12345678901234",
      address: "1 rue de la Formation, 75001 Paris",
      phone: "01 23 45 67 89",
      email: "contact@entreprise-demo.fr",
    },
  });

  const password = await bcrypt.hash("password123", 10);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@formapro.fr" },
    update: {},
    create: {
      email: "admin@formapro.fr",
      name: "Admin FormaPro",
      passwordHash: password,
      role: "ADMIN",
    },
  });

  const formateur = await prisma.user.upsert({
    where: { email: "formateur@formapro.fr" },
    update: {},
    create: {
      email: "formateur@formapro.fr",
      name: "Jean Formateur",
      passwordHash: password,
      role: "FORMATEUR",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@entreprise-demo.fr" },
    update: {},
    create: {
      email: "client@entreprise-demo.fr",
      name: "Marie Client",
      passwordHash: password,
      role: "CLIENT",
      organizationId: org.id,
    },
  });

  const stagiaire = await prisma.user.upsert({
    where: { email: "stagiaire@entreprise-demo.fr" },
    update: {},
    create: {
      email: "stagiaire@entreprise-demo.fr",
      name: "Pierre Stagiaire",
      passwordHash: password,
      role: "STAGIAIRE",
      organizationId: org.id,
    },
  });

  const stagiaire2 = await prisma.user.upsert({
    where: { email: "sophie@entreprise-demo.fr" },
    update: {},
    create: {
      email: "sophie@entreprise-demo.fr",
      name: "Sophie Martin",
      passwordHash: password,
      role: "STAGIAIRE",
      organizationId: org.id,
    },
  });

  // Formations
  const formExcel = await prisma.formation.create({
    data: {
      title: "Excel Avancé - Tableaux croisés dynamiques",
      description:
        "Maîtrisez les fonctionnalités avancées d'Excel pour l'analyse de données.",
      objectives:
        "Créer des tableaux croisés dynamiques\nUtiliser les formules avancées\nAutomatiser avec les macros",
      durationHours: 14,
      price: 1200,
      category: "BUREAUTIQUE",
      isActive: true,
    },
  });

  const formManagement = await prisma.formation.create({
    data: {
      title: "Management d'équipe - Les fondamentaux",
      description:
        "Développez vos compétences managériales pour mieux encadrer votre équipe.",
      objectives:
        "Adapter son style de management\nMotiver son équipe\nGérer les conflits",
      durationHours: 21,
      price: 2400,
      category: "MANAGEMENT",
      isActive: true,
    },
  });

  const formSecurite = await prisma.formation.create({
    data: {
      title: "SST - Sauveteur Secouriste du Travail",
      description: "Formation initiale SST conforme au référentiel INRS.",
      objectives: "Protéger, examiner, alerter et secourir",
      durationHours: 14,
      price: 350,
      category: "SECURITE",
      isActive: true,
      certificationName: "SST",
      certificationBody: "INRS",
    },
  });

  await prisma.formation.create({
    data: {
      title: "Anglais professionnel - Niveau B2",
      description: "Améliorez votre anglais pour un contexte professionnel.",
      durationHours: 30,
      price: 1800,
      category: "LANGUES",
      isActive: true,
    },
  });

  // Sessions
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekEnd = new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000);

  const sessionExcel = await prisma.sessionFormation.create({
    data: {
      formationId: formExcel.id,
      startDate: nextWeek,
      endDate: nextWeekEnd,
      modality: "PRESENTIEL",
      location: "Paris - Salle A",
      maxParticipants: 10,
      formateurId: formateur.id,
      trainerCost: 800,
      status: "CONFIRMEE",
    },
  });

  const sessionManagement = await prisma.sessionFormation.create({
    data: {
      formationId: formManagement.id,
      startDate: lastWeek,
      endDate: lastWeekEnd,
      modality: "MIXTE",
      location: "Paris + Teams",
      maxParticipants: 8,
      formateurId: formateur.id,
      trainerCost: 1500,
      status: "TERMINEE",
    },
  });

  await prisma.sessionFormation.create({
    data: {
      formationId: formSecurite.id,
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000),
      modality: "PRESENTIEL",
      location: "Lyon - Centre de formation",
      maxParticipants: 12,
      status: "PLANIFIEE",
    },
  });

  // Enrollments
  await prisma.enrollment.create({
    data: {
      sessionId: sessionExcel.id,
      stagiaireId: stagiaire.id,
      origin: "ENTREPRISE",
      clientId: org.id,
      status: "CONFIRME",
    },
  });

  await prisma.enrollment.create({
    data: {
      sessionId: sessionExcel.id,
      stagiaireId: stagiaire2.id,
      origin: "ENTREPRISE",
      clientId: org.id,
      status: "INSCRIT",
    },
  });

  await prisma.enrollment.create({
    data: {
      sessionId: sessionManagement.id,
      stagiaireId: stagiaire.id,
      origin: "ENTREPRISE",
      clientId: org.id,
      status: "PRESENT",
    },
  });

  console.log("Seed completed!");
  console.log("\nComptes de test (mot de passe: password123):");
  console.log("  Admin:      admin@formapro.fr");
  console.log("  Formateur:  formateur@formapro.fr");
  console.log("  Client:     client@entreprise-demo.fr");
  console.log("  Stagiaire:  stagiaire@entreprise-demo.fr");
  console.log("  Stagiaire2: sophie@entreprise-demo.fr");
  console.log("\nFormations créées: 4");
  console.log("Sessions créées: 3");
  console.log("Inscriptions créées: 3");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
