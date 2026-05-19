export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";
import { encryptNSS } from "@/lib/encryption";

// Audit 2026-05-19 §2.7 : Zod + regex NSS française (15 chiffres exactement,
// avec ou sans espaces qu'on strip avant validation).
const inscriptionSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  entreprise: z.string().optional(),
  entrepriseSiret: z.string().regex(/^\d{14}$/, "SIRET = 14 chiffres").optional().or(z.literal("")),
  entrepriseAdresse: z.string().optional(),
  entrepriseCodePostal: z.string().optional(),
  entrepriseVille: z.string().optional(),
  adressePerso: z.string().optional(),
  codePostalPerso: z.string().optional(),
  villePerso: z.string().optional(),
  profession: z.string().optional(),
  numeroDiplome: z.string().optional(),
  dateNaissance: z.string().optional(),
  numeroSecuriteSociale: z
    .string()
    .transform((s) => s.replace(/\s/g, ""))
    .pipe(
      z.string().regex(/^\d{15}$/, "NSS = 15 chiffres").optional().or(z.literal("")),
    )
    .optional(),
  besoinsAdaptation: z.string().optional(),
  consentementRGPD: z.boolean().refine((v) => v === true, "Consentement RGPD obligatoire"),
});

// GET: session info for public form
export const GET = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:inscription:get");
  if (limited) return limited;

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
});

// POST: submit registration
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:inscription:post");
  if (limited) return limited;

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

  const body = await req.json().catch(() => null);
  const parsed = inscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const {
    nom,
    prenom,
    email,
    telephone,
    entreprise,
    entrepriseSiret,
    entrepriseAdresse,
    entrepriseCodePostal,
    entrepriseVille,
    adressePerso,
    codePostalPerso,
    villePerso,
    profession,
    numeroDiplome,
    dateNaissance,
    numeroSecuriteSociale,
    besoinsAdaptation,
  } = parsed.data;

  // Find or create entreprise — priorité au SIRET (clé unique fiable) sur le nom
  let entrepriseId: string | null = null;
  if (entrepriseSiret) {
    const cleaned = String(entrepriseSiret).replace(/\s/g, "");
    try {
      const ent = await prisma.entreprise.upsert({
        where: { siret: cleaned },
        update: {},
        create: {
          siret: cleaned,
          nom: entreprise || "Entreprise sans nom",
          adresse: entrepriseAdresse || null,
          codePostal: entrepriseCodePostal || null,
          ville: entrepriseVille || null,
        },
        select: { id: true },
      });
      entrepriseId = ent.id;
    } catch {
      // Fallback : recherche par nom si l'upsert SIRET échoue
      entrepriseId = await fallbackByName(entreprise);
    }
  } else if (entreprise) {
    entrepriseId = await fallbackByName(entreprise);
  }

  async function fallbackByName(nomEntreprise: string | undefined | null): Promise<string | null> {
    if (!nomEntreprise) return null;
    let ent = await prisma.entreprise.findFirst({ where: { nom: nomEntreprise } });
    if (!ent) {
      try {
        ent = await prisma.entreprise.create({ data: { nom: nomEntreprise } });
      } catch {
        ent = await prisma.entreprise.findFirst({ where: { nom: nomEntreprise } });
      }
    }
    return ent?.id ?? null;
  }

  const contactExtraData: Record<string, unknown> = {};
  if (dateNaissance) {
    const d = new Date(dateNaissance);
    if (!isNaN(d.getTime())) contactExtraData.dateNaissance = d;
  }
  if (numeroSecuriteSociale) {
    contactExtraData.numeroSecuriteSociale = encryptNSS(String(numeroSecuriteSociale).replace(/\s/g, ""));
  }
  if (besoinsAdaptation) contactExtraData.besoinsAdaptation = besoinsAdaptation;
  if (adressePerso) contactExtraData.adressePerso = String(adressePerso);
  if (codePostalPerso) contactExtraData.codePostalPerso = String(codePostalPerso);
  if (villePerso) contactExtraData.villePerso = String(villePerso);
  if (profession) contactExtraData.poste = String(profession);
  if (numeroDiplome) contactExtraData.diplomeObtenu = String(numeroDiplome);

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
    // Mise a jour des donnees legales si fournies et manquantes (on n'écrase
    // jamais ce qui est déjà saisi, on remplit uniquement les vides).
    const updateData: Record<string, unknown> = {};
    if (contactExtraData.dateNaissance && !contact.dateNaissance) updateData.dateNaissance = contactExtraData.dateNaissance;
    if (contactExtraData.numeroSecuriteSociale && !contact.numeroSecuriteSociale) updateData.numeroSecuriteSociale = contactExtraData.numeroSecuriteSociale;
    if (contactExtraData.besoinsAdaptation && !contact.besoinsAdaptation) updateData.besoinsAdaptation = contactExtraData.besoinsAdaptation;
    if (contactExtraData.adressePerso && !contact.adressePerso) updateData.adressePerso = contactExtraData.adressePerso;
    if (contactExtraData.codePostalPerso && !contact.codePostalPerso) updateData.codePostalPerso = contactExtraData.codePostalPerso;
    if (contactExtraData.villePerso && !contact.villePerso) updateData.villePerso = contactExtraData.villePerso;
    if (contactExtraData.poste && !contact.poste) updateData.poste = contactExtraData.poste;
    if (contactExtraData.diplomeObtenu && !contact.diplomeObtenu) updateData.diplomeObtenu = contactExtraData.diplomeObtenu;
    if (entrepriseId && !contact.entrepriseId) updateData.entrepriseId = entrepriseId;
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
});
