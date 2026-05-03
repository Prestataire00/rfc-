export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { pickImageForFormation } from "@/lib/formation-images";

// POST /api/formations/seed-rfc — seed le catalogue officiel RFC (23 formations).
// Idempotent : ne re-cree pas une formation deja existante (matching par titre).
//
// Atomique : 23 ecritures dans un seul prisma.$transaction. Si une formation
// echoue (par ex. contrainte unique non respectee, donnee mal formee), aucune
// n'est inseree -> pas de catalogue partiel a moitie peuple.
//
// L'image est auto-attribuee via pickImageForFormation (pool Pexels par categorie,
// hash du titre pour rotation deterministe). Une formation seedee garde sa meme
// image entre deux runs.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.formation.findMany({ select: { titre: true } });
    const existingTitres = new Set(existing.map((f) => f.titre));

    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const f of CATALOGUE_RFC) {
      const data = { ...f, image: pickImageForFormation(f.titre, f.categorie) };
      if (existingTitres.has(f.titre)) {
        if (force) {
          await tx.formation.updateMany({
            where: { titre: f.titre },
            data,
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }
      await tx.formation.create({ data });
      created++;
    }

    return { created, skipped, updated };
  });

  return NextResponse.json({ ...result, total: CATALOGUE_RFC.length });
});

// Images Pexels thematiques (libres de droits, URLs stables)
// Photos selectionnees pour leur pertinence directe au metier RFC
const IMG = {
  // Secourisme : trousse de premiers secours, defibrillateur, formation CPR
  secourisme: "https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=800",
  premiers_secours: "https://images.pexels.com/photos/6520207/pexels-photo-6520207.jpeg?auto=compress&cs=tinysrgb&w=800",

  // SSIAP : pompiers en uniforme, formation incendie
  ssiap_initial: "https://images.pexels.com/photos/280076/pexels-photo-280076.jpeg?auto=compress&cs=tinysrgb&w=800",
  ssiap_recyclage: "https://images.pexels.com/photos/9002745/pexels-photo-9002745.jpeg?auto=compress&cs=tinysrgb&w=800",
  ssiap_chef: "https://images.pexels.com/photos/8985641/pexels-photo-8985641.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Exercices incendie
  extincteur: "https://images.pexels.com/photos/280076/pexels-photo-280076.jpeg?auto=compress&cs=tinysrgb&w=800",
  evacuation: "https://images.pexels.com/photos/2293046/pexels-photo-2293046.jpeg?auto=compress&cs=tinysrgb&w=800",
  guide_file: "https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=800",

  // APS : agent de securite en uniforme
  aps: "https://images.pexels.com/photos/2099691/pexels-photo-2099691.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Videoprotection : ecrans de surveillance, cameras CCTV
  videoprotection: "https://images.pexels.com/photos/95425/pexels-photo-95425.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Habilitation electrique : tableau electrique, electricien
  electricite: "https://images.pexels.com/photos/3964340/pexels-photo-3964340.jpeg?auto=compress&cs=tinysrgb&w=800",
};

// Catalogue officiel RFC — d'apres le PDF du 01/06/2025
const CATALOGUE_RFC = [
  // ============= SECOURISME =============
  {
    titre: "Sauveteur Secouriste du Travail (SST)",
    image: IMG.secourisme,
    description: "Formation initiale SST. Le personnel sera capable de participer a la prevention dans l'entreprise et de connaitre les gestes elementaires de secours dans l'attente des services de secours specialises.",
    duree: 14, tarif: 250, niveau: "tous", certifiante: true,
    categorie: "Secourisme",
    prerequis: "Aucun prerequis necessaire",
    objectifs: "Le personnel sera capable de participer a la prevention dans l'entreprise, de connaitre les gestes elementaires de secours, dans l'attente des services de secours specialises.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Tout salarie de l'entreprise. Minimum 4, maximum 10 personnes.",
    methodesEvaluation: "Evaluation fin de formation sous forme d'exercice pratique, dans le respect de la grille de certification INRS.",
    accessibilite: "La formation est accessible aux PSH avec adaptations possibles selon les besoins specifiques.",
    indicateursResultats: "Taux de reussite 98%, taux de satisfaction 99%",
    typesFinancement: JSON.stringify(["opco"]),
    dureeRecyclage: 24, misEnAvant: true,
  },
  {
    titre: "MAC SST - Maintien et actualisation des competences",
    image: IMG.secourisme,
    description: "Recyclage SST tous les 24 mois. Assurer que les SST conservent leurs connaissances et leurs reflexes pour porter secours rapidement et efficacement.",
    duree: 7, tarif: 150, niveau: "tous", certifiante: true,
    categorie: "Secourisme",
    prerequis: "Etre titulaire du certificat SST. Le certificat doit etre encore valide (moins de 2 ans).",
    objectifs: "Maintenir les connaissances et reflexes SST. Integrer les evolutions des gestes de secours et des recommandations de l'INRS. Sensibiliser aux risques specifiques de l'environnement professionnel.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Titulaires du certificat SST. Minimum 4, maximum 10 personnes.",
    methodesEvaluation: "Evaluation pratique selon grille de certification INRS.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
    dureeRecyclage: 24,
  },
  {
    titre: "Initiation aux gestes de premiers secours",
    image: IMG.premiers_secours,
    description: "Acquerir les competences d'intervention en toute securite lors d'un accident et porter secours.",
    duree: 7, tarif: 120, niveau: "tous", certifiante: false,
    categorie: "Secourisme",
    prerequis: "Aucun prerequis necessaire",
    objectifs: "Acquerir les competences d'intervention en toute securite lors d'un accident. Acquerir les competences necessaires pour porter secours. Repondre aux obligations de l'employeur en matiere de secourisme.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Tout public. Minimum 4, maximum 10 personnes.",
    methodesEvaluation: "Exercice pratique et QCM.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
  },

  // ============= SSIAP 1 =============
  {
    titre: "SSIAP 1 - Agent de service de securite incendie",
    image: IMG.ssiap_initial,
    description: "Formation initiale SSIAP 1 pour postuler a un poste d'agent de securite incendie en ERP ou IGH.",
    duree: 70, tarif: 1200, niveau: "tous", certifiante: true,
    categorie: "Securite Incendie",
    prerequis: "Aptitude medicale de moins de 3 mois. PSC1 (< 2 ans) ou PSE1, PSE2 ou SST en cours de validite. Habilitation electrique B0-H0-H0V (executant) au minimum de moins de 3 ans. Capacite a retranscrire des anomalies sur une main courante.",
    objectifs: "Former a l'exercice d'agent de securite incendie en etablissement recevant du public (ERP) ou immeuble de grande hauteur (IGH).",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Personnes souhaitant postuler comme agent de securite incendie. Minimum 4, maximum 12 personnes.",
    methodesEvaluation: "Examen final : QCM + epreuve pratique selon arrete du 02 mai 2005 modifie.",
    accessibilite: "Aptitude medicale requise.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
    dureeRecyclage: 36, misEnAvant: true,
  },
  {
    titre: "Recyclage SSIAP 1",
    image: IMG.ssiap_recyclage,
    description: "Recyclage triennal SSIAP 1 pour les agents en activite.",
    duree: 14, tarif: 300, niveau: "tous", certifiante: true,
    categorie: "Securite Incendie",
    prerequis: "Aptitude medicale de moins de 3 mois. PSC1, PSE1, PSE2 ou SST en cours de validite. Etre titulaire du SSIAP 1 et justifier de 1607h sur les 24 derniers mois.",
    objectifs: "Maintenir et actualiser les competences SSIAP 1.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Agents SSIAP 1 en activite. Minimum 4, maximum 12 personnes.",
    methodesEvaluation: "Attestation de recyclage conforme a l'arrete du 02 mai 2005 modifie.",
    accessibilite: "Aptitude medicale requise.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
    dureeRecyclage: 36,
  },
  {
    titre: "Remise a niveau SSIAP 1",
    image: IMG.ssiap_recyclage,
    description: "Remise a niveau SSIAP 1 pour agents dont le diplome est perime.",
    duree: 21, tarif: 450, niveau: "tous", certifiante: true,
    categorie: "Securite Incendie",
    prerequis: "PSC1, PSE1, PSE2 ou SST en cours de validite. Etre titulaire du SSIAP 1 (justifier 1607h sur 24 derniers mois).",
    objectifs: "Renouveler la qualification SSIAP 1.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Agents SSIAP 1 dont la qualification est perimee. Minimum 4, maximum 12.",
    methodesEvaluation: "Attestation de recyclage conforme a l'arrete du 02 mai 2005 modifie.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
  },

  // ============= SSIAP 2 =============
  {
    titre: "SSIAP 2 - Chef d'equipe de service de securite incendie",
    image: IMG.ssiap_chef,
    description: "Formation initiale SSIAP 2 pour postuler comme chef d'equipe de securite incendie en ERP ou IGH.",
    duree: 70, tarif: 1500, niveau: "intermediaire", certifiante: true,
    categorie: "Securite Incendie",
    prerequis: "Aptitude medicale < 3 mois. PSC1, PSE1, PSE2 ou SST en cours de validite. Habilitation electrique B0-H0-H0V au minimum < 3 ans. Etre titulaire du SSIAP 1 (1607h sur 24 derniers mois).",
    objectifs: "Management d'une equipe d'agent de securite incendie (K2502). Securite publique (K1706). Securite et surveillance privee (K2503).",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Agents SSIAP 1 voulant evoluer chef d'equipe. Minimum 4, maximum 12.",
    methodesEvaluation: "Examen final : exercice pratique + QCM selon arrete du 02 mai 2005 modifie.",
    accessibilite: "Aptitude medicale requise.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
    dureeRecyclage: 36,
  },
  {
    titre: "Recyclage SSIAP 2",
    image: IMG.ssiap_chef,
    description: "Recyclage triennal SSIAP 2.",
    duree: 14, tarif: 350, niveau: "intermediaire", certifiante: true,
    categorie: "Securite Incendie",
    prerequis: "PSC1, PSE1, PSE2 ou SST en cours. SSIAP 1 (1607h sur 24 derniers mois).",
    objectifs: "Maintenir et actualiser les competences SSIAP 2.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Chefs d'equipe SSIAP 2 en activite. Min 4, max 12.",
    methodesEvaluation: "Attestation de recyclage conforme arrete 02 mai 2005.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
    dureeRecyclage: 36,
  },
  {
    titre: "Remise a niveau SSIAP 2",
    image: IMG.ssiap_chef,
    description: "Remise a niveau SSIAP 2 pour chefs d'equipe dont le diplome est perime.",
    duree: 21, tarif: 500, niveau: "intermediaire", certifiante: true,
    categorie: "Securite Incendie",
    prerequis: "PSC1, PSE1, PSE2 ou SST en cours. SSIAP 1 (1607h sur 24 derniers mois).",
    objectifs: "Renouveler la qualification SSIAP 2.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Chefs d'equipe SSIAP 2 perimes. Min 4, max 12.",
    methodesEvaluation: "Attestation de recyclage conforme arrete 02 mai 2005.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
  },

  // ============= SSIAP 3 =============
  {
    titre: "SSIAP 3 - Chef de service de securite incendie",
    image: IMG.ssiap_chef,
    description: "Formation initiale SSIAP 3 - chef de service securite incendie pour ERP et IGH.",
    duree: 217, tarif: 4500, niveau: "avance", certifiante: true,
    categorie: "Securite Incendie", codeRNCP: "RS5643",
    prerequis: "Qualification secourisme en cours (SST, PSC1 < 2 ans, PSE1, PSE2, CFAPSE). Habilitation electrique en cours. Diplome niveau 4 minimum OU SSIAP 2 avec 3 ans d'experience. Aptitude medicale < 3 mois.",
    objectifs: "Former des chefs de service de securite incendie capables d'assurer le management du service, le conseil au chef d'etablissement en matiere de securite incendie, le suivi reglementaire et la formation du personnel.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Cadres SSIAP. Min 4, max 10.",
    methodesEvaluation: "Epreuve theorique (QCM) + redaction d'une notice de securite + oral.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
    dureeRecyclage: 36, misEnAvant: true,
  },
  {
    titre: "Recyclage SSIAP 3",
    image: IMG.ssiap_chef,
    description: "Recyclage triennal SSIAP 3.",
    duree: 21, tarif: 600, niveau: "avance", certifiante: true,
    categorie: "Securite Incendie",
    prerequis: "Etre titulaire du SSIAP 3. Secourisme (PSC1, SST ou PSE1) en cours. Avoir exerce la fonction de chef de service 1607h sur les 36 derniers mois.",
    objectifs: "Maintenir et actualiser les competences reglementaires et techniques. Connaitre les evolutions ERP/IGH. Piloter un service de securite.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Chefs de service SSIAP 3 en activite. Min 4, max 10.",
    methodesEvaluation: "Evaluation continue (QCM, mises en situation). Attestation de recyclage SSIAP 3.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "cpf"]),
    dureeRecyclage: 36,
  },
  {
    titre: "Remise a niveau SSIAP 3",
    image: IMG.ssiap_chef,
    description: "Remise a niveau SSIAP 3 pour chefs de service dont le diplome est perime.",
    duree: 35, tarif: 900, niveau: "avance", certifiante: true,
    categorie: "Securite Incendie", codeRNCP: "RS5643",
    prerequis: "Qualification secourisme en cours. Habilitation electrique en cours. Diplome niveau 4 OU SSIAP 2 avec 3 ans d'experience.",
    objectifs: "Renouveler la qualification SSIAP 3.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Chefs de service SSIAP 3 perimes. Min 4, max 10.",
    methodesEvaluation: "QCM + notice de securite + oral.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
  },

  // ============= EXERCICES INCENDIE =============
  {
    titre: "Exercice de manipulation des moyens de secours",
    image: IMG.extincteur,
    description: "Formation pratique a la manipulation des extincteurs en cas de depart de feu.",
    duree: 2, tarif: 80, niveau: "tous", certifiante: false,
    categorie: "Securite Incendie",
    prerequis: "Aucun prerequis",
    objectifs: "Identifier les differents types d'extincteurs. Manipuler un extincteur en respectant les regles de securite. Reagir efficacement en cas de depart de feu. Appliquer les bons gestes pour eteindre un feu en toute securite.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Tout salarie. Min 4, max 20.",
    methodesEvaluation: "Evaluation pratique (exercice) et theorique (QCM).",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["entreprise"]),
    dureeRecyclage: 12,
  },
  {
    titre: "Exercice d'evacuation",
    image: IMG.evacuation,
    description: "Formation pratique a l'evacuation d'urgence en cas d'alerte incendie.",
    duree: 1, tarif: 50, niveau: "tous", certifiante: false,
    categorie: "Securite Incendie",
    prerequis: "Aucun prerequis",
    objectifs: "Reagir efficacement a une alerte incendie. Identifier et emprunter les itineraires d'evacuation. Se rendre au point de rassemblement en toute securite.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Tout salarie. Min 4, max 20.",
    methodesEvaluation: "Evaluation pratique (exercice) et theorique (QCM).",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["entreprise"]),
    dureeRecyclage: 12,
  },
  {
    titre: "Guide-file et Serre-file",
    image: IMG.guide_file,
    description: "Formation des guides et serre-files responsables de l'evacuation des locaux.",
    duree: 4, tarif: 100, niveau: "tous", certifiante: false,
    categorie: "Securite Incendie",
    prerequis: "Aucun prerequis",
    objectifs: "Comprendre le role et les responsabilites d'un guide ou serre-file. Guider efficacement les occupants vers les issues de secours. S'assurer qu'aucune personne ne reste dans les locaux. Gerer le stress et maintenir le calme. Anticiper les obstacles.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Salaries designes guide-file ou serre-file. Min 4, max 20.",
    methodesEvaluation: "Aucune evaluation formelle (sensibilisation).",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["entreprise"]),
    dureeRecyclage: 12,
  },

  // ============= APS / PREVENTION SECURITE =============
  {
    titre: "TFP APS - Agent de Prevention et de Securite",
    image: IMG.aps,
    description: "Titre a finalite professionnelle d'agent de prevention et de securite. Obligatoire pour exercer en tant qu'agent de securite et obtenir la carte professionnelle CNAPS.",
    duree: 175, tarif: 2500, niveau: "tous", certifiante: true,
    categorie: "Prevention Securite", codeRNCP: "RNCP37035",
    prerequis: "Casier judiciaire vierge (Bulletin n2). Comprendre et parler le francais (B1 minimum). Autorisation prealable du CNAPS avant l'entree en formation.",
    objectifs: "Obtenir le TFP APS, obligatoire pour exercer en tant qu'agent de securite et obtenir la carte professionnelle delivree par le CNAPS.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Personnes souhaitant exercer comme agent de securite. Min 4, max 12.",
    methodesEvaluation: "Test theorique (QCU) + epreuve pratique.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
    dureeRecyclage: 60, misEnAvant: true,
  },
  {
    titre: "MAC APS - Maintien et actualisation des competences APS",
    image: IMG.aps,
    description: "Recyclage quinquennal obligatoire pour les agents de prevention et securite.",
    duree: 34, tarif: 600, niveau: "tous", certifiante: true,
    categorie: "Prevention Securite",
    prerequis: "Carte professionnelle CNAPS surveillance humaine ou electronique. Justificatif de domicile < 3 mois. Justificatif niveau B1 francais (CERL).",
    objectifs: "Renouveler les competences tous les 5 ans selon arrete du 27 fevrier 2017 sur la formation continue des Agents Prives de Securite.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Agents APS en activite. Min 4, max 12.",
    methodesEvaluation: "Test theorique (QCU) + pratique.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
    dureeRecyclage: 60,
  },

  // ============= VIDEOPROTECTION =============
  {
    titre: "OVP - Operateur Videoprotection",
    image: IMG.videoprotection,
    description: "Formation initiale d'operateur videoprotection - Titre RNCP 37737.",
    duree: 159, tarif: 2200, niveau: "tous", certifiante: true,
    categorie: "Videoprotection", codeRNCP: "RNCP37737",
    prerequis: "Casier judiciaire vierge. Aptitude medicale (vision, concentration). Francais oral et ecrit niveau A2-B1. Demande de carte professionnelle CNAPS surveillance par systemes electroniques.",
    objectifs: "Connaitre la reglementation videoprotection. Maitriser le fonctionnement d'un systeme. Reagir en cas d'evenement (intrusion, vol, agression). Exploiter les images, rediger des comptes rendus, travailler avec les forces de l'ordre.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Personnes souhaitant exercer en surveillance par videoprotection. Min 4, max 12.",
    methodesEvaluation: "Mises en situation reconstituees + questionnaire professionnel + entretien technique devant un jury.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
    dureeRecyclage: 60,
  },
  {
    titre: "OVP - Module complementaire (titulaires APS)",
    image: IMG.videoprotection,
    description: "Module videoprotection complementaire pour titulaires de la carte APS surveillance humaine.",
    duree: 95, tarif: 1500, niveau: "tous", certifiante: true,
    categorie: "Videoprotection", codeRNCP: "RNCP37737",
    prerequis: "Autorisation prealable CNAPS (valable 6 mois) ou carte APS mention surveillance humaine. Niveau francais B1. Justificatif de domicile < 3 mois.",
    objectifs: "Acquerir les competences videoprotection en complement d'une carte APS surveillance humaine.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Agents APS surveillance humaine. Min 4, max 12.",
    methodesEvaluation: "Mises en situation + questionnaire + entretien jury.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
    dureeRecyclage: 60,
  },
  {
    titre: "MAC OVP - Recyclage Operateur Videoprotection",
    image: IMG.videoprotection,
    description: "Recyclage quinquennal des operateurs videoprotection.",
    duree: 31, tarif: 550, niveau: "tous", certifiante: true,
    categorie: "Videoprotection",
    prerequis: "Detenir une carte professionnelle ou autorisation CNAPS dans l'activite concernee. Conditions de l'arrete du 1er juillet 2016 (JORF 0169).",
    objectifs: "Maintenir et actualiser les competences en videoprotection.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Operateurs videoprotection en activite. Min 4, max 12.",
    methodesEvaluation: "Test d'evaluation en fin de formation.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco"]),
    dureeRecyclage: 60,
  },

  // ============= HABILITATION ELECTRIQUE =============
  {
    titre: "Habilitation electrique H0-B0",
    image: IMG.electricite,
    description: "Habilitation electrique non electricien (executant) pour personnes intervenant a proximite d'installations electriques.",
    duree: 7, tarif: 200, niveau: "tous", certifiante: true,
    categorie: "Habilitation Electrique",
    prerequis: "Aucun prerequis technique en electricite. Aptitude medicale au travail peut etre requise.",
    objectifs: "Comprendre les dangers de l'electricite et adopter les bonnes pratiques pour travailler en securite a proximite des installations electriques selon UTEC C 18-510.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Personnes intervenant a proximite d'installations electriques (travaux non electriques). Min 4, max 12.",
    methodesEvaluation: "Test theorique (QCM). Delivrance attestation de formation.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "entreprise"]),
    dureeRecyclage: 36,
  },
  {
    titre: "Habilitation electrique BS-BE",
    image: IMG.electricite,
    description: "Habilitation electrique pour intervention de manoeuvres simples sur installations basse tension.",
    duree: 14, tarif: 350, niveau: "tous", certifiante: true,
    categorie: "Habilitation Electrique",
    prerequis: "Aucun prerequis technique. Aptitude medicale peut etre requise. Etre concerne par des travaux d'ordre electrique ponctuels.",
    objectifs: "Realiser des manoeuvres simples sur des installations electriques en basse tension dans le respect des consignes de securite pour eviter les risques electriques.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Personnes intervenant ponctuellement en basse tension. Min 4, max 12.",
    methodesEvaluation: "Test theorique (QCM) + pratique. Delivrance attestation.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "entreprise"]),
    dureeRecyclage: 36,
  },
  {
    titre: "Habilitation electrique BR-H0V",
    image: IMG.electricite,
    description: "Habilitation electrique pour interventions completes en basse tension (BR) et travaux a proximite haute tension (H0V).",
    duree: 21, tarif: 500, niveau: "intermediaire", certifiante: true,
    categorie: "Habilitation Electrique",
    prerequis: "Aucun prerequis technique requis (mais experience recommandee). Aptitude medicale peut etre requise.",
    objectifs: "Acquerir les competences pour la mise en place d'une habilitation electrique en entreprise. Sensibiliser aux dangers du courant electrique. Executer en securite des operations dans le respect de la norme NF C18-510.",
    modalite: "presentiel", statut: "publiee", actif: true,
    publicCible: "Charges d'intervention basse tension. Min 4, max 12.",
    methodesEvaluation: "Test theorique (QCM) + pratique. Delivrance attestation.",
    accessibilite: "Accessible aux PSH avec adaptations.",
    typesFinancement: JSON.stringify(["opco", "entreprise"]),
    dureeRecyclage: 36,
  },
];
