// POST /api/modeles-document/[id]/render-for-contact
//
// Genere un PDF d'un modele IA en substituant les variables {{xxx}} avec
// les vraies donnees d'un contact (et son entreprise le cas echeant).
//
// Body : { contactId: string, sessionId?: string, customVars?: Record<string, string> }
//
// Variables substituees automatiquement :
//   - {{entreprise.*}}    organisme : nomEntreprise, adresse, codePostal, ville,
//                         telephone, email, siret, nda, tvaIntracom, representant,
//                         representantQualite
//   - {{stagiaire.*}} / {{contact.*}} / {{client.*}} (alias) : civilite, prenom,
//                         nom, email, telephone, poste, sexe, dateNaissance,
//                         lieuNaissance, pays, adresse, codePostal, ville,
//                         numeroCartePro, numeroFranceTravail, diplomeObtenu,
//                         niveauFormation
//   - {{formation.*}}     titre, duree, objectifs (via la session)
//   - {{session.*}}       dateDebut, dateFin, lieu
//   - {{formateur.*}}     prenom, nom
//   - {{societe.*}}       entreprise du contact (nom, adresse, codePostal, ville, siret)
//   - {{date.aujourdhui}} date du jour formatee FR
//
// Le contexte formation/session vient de sessionId si fourni, sinon de la
// derniere inscription du stagiaire.
//
// customVars : overrides supplementaires (cles libres pour les besoins
// du modele : montants, dates particulieres, etc.).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { documentLibrePdf } from "@/lib/pdf/document-libre";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { pdfResponse } from "@/lib/pdf/response";
import { resolveBranding } from "@/lib/pdf/branding";
import { getParametres } from "@/lib/parametres";
import { applyVariables } from "@/lib/message-templates";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";
}

export const POST = withErrorHandlerParams<{ id: string }>(
  async (req: NextRequest, { params }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      contactId?: string;
      sessionId?: string;
      customVars?: Record<string, string>;
    };

    if (!body.contactId) {
      return NextResponse.json({ error: "contactId requis" }, { status: 400 });
    }

    const [modele, contact, parametres] = await Promise.all([
      prisma.modeleDocumentIA.findUnique({ where: { id: params.id } }),
      prisma.contact.findUnique({
        where: { id: body.contactId },
        include: { entreprise: true },
      }),
      getParametres(),
    ]);

    if (!modele) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    if (!contact) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

    // Contexte formation/session : sessionId fourni, sinon la dernière session
    // du stagiaire (via sa dernière inscription). Donne accès à formation.*,
    // session.* et formateur.* aux documents IA.
    const sessionCtx = body.sessionId
      ? await prisma.session.findUnique({
          where: { id: body.sessionId },
          include: { formation: true, formateur: true },
        })
      : await prisma.inscription
          .findFirst({
            where: { contactId: contact.id },
            orderBy: { createdAt: "desc" },
            include: { session: { include: { formation: true, formateur: true } } },
          })
          .then((insc) => insc?.session ?? null);

    const branding = await resolveBranding(parametres);

    // Construit le contexte de substitution. Les alias stagiaire/contact
    // pointent sur les mêmes données — laisse le rédacteur du modèle libre
    // d'écrire {{stagiaire.prenom}} ou {{contact.prenom}}.
    const fmtD = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
    const civilite = contact.sexe === "M" ? "M." : contact.sexe === "F" ? "Mme" : "";
    const clientVars = {
      civilite,
      prenom: contact.prenom,
      nom: contact.nom,
      email: contact.email,
      telephone: contact.telephone ?? "",
      poste: contact.poste ?? "",
      // Identité complète (fiche d'inscription individuelle)
      sexe: contact.sexe ?? "",
      dateNaissance: fmtD(contact.dateNaissance),
      lieuNaissance: contact.lieuNaissance ?? "",
      pays: contact.pays ?? "",
      adresse: contact.adressePerso ?? "",
      codePostal: contact.codePostalPerso ?? "",
      ville: contact.villePerso ?? "",
      numeroCartePro: contact.numeroCartePro ?? "",
      numeroFranceTravail: contact.numeroFranceTravail ?? "",
      diplomeObtenu: contact.diplomeObtenu ?? "",
      niveauFormation: contact.niveauFormation ?? "",
    };
    const societeVars = contact.entreprise
      ? {
          nom: contact.entreprise.nom,
          adresse: contact.entreprise.adresse ?? "",
          codePostal: contact.entreprise.codePostal ?? "",
          ville: contact.entreprise.ville ?? "",
          siret: contact.entreprise.siret ?? "",
        }
      : {};

    const formationVars = sessionCtx?.formation
      ? {
          titre: sessionCtx.formation.titre,
          duree: sessionCtx.formation.duree,
          objectifs: sessionCtx.formation.objectifs ?? "",
        }
      : {};
    const sessionVars = sessionCtx
      ? {
          dateDebut: fmtD(sessionCtx.dateDebut),
          dateFin: fmtD(sessionCtx.dateFin),
          lieu: sessionCtx.lieu ?? "",
        }
      : {};
    const formateurVars = sessionCtx?.formateur
      ? { prenom: sessionCtx.formateur.prenom, nom: sessionCtx.formateur.nom }
      : {};

    const vars: Record<string, unknown> = {
      entreprise: {
        nomEntreprise: parametres.nomEntreprise,
        adresse: parametres.adresse,
        codePostal: parametres.codePostal,
        ville: parametres.ville,
        telephone: parametres.telephone,
        email: parametres.email,
        siret: parametres.siret,
        nda: parametres.nda,
        tvaIntracom: parametres.tvaIntracom,
        // Représentant légal (utilisé sur attestation / certificat)
        representant: [parametres.representantPrenom, parametres.representantNom].filter(Boolean).join(" "),
        representantQualite: parametres.representantQualite,
      },
      client: clientVars,
      stagiaire: clientVars,
      contact: clientVars,
      societe: societeVars,
      formation: formationVars,
      session: sessionVars,
      formateur: formateurVars,
      date: {
        aujourdhui: new Date().toLocaleDateString("fr-FR"),
      },
      ...(body.customVars ?? {}),
    };

    const fill = (text: string | null): string => {
      if (!text) return "";
      return applyVariables(text, vars);
    };

    const docDef = documentLibrePdf(
      {
        titre: fill(modele.titre),
        introduction: fill(modele.introduction),
        corps: fill(modele.corps),
        mentions: fill(modele.mentions),
      },
      { branding },
    );

    const buffer = await generatePdfBuffer(docDef);
    const nomClient = `${contact.prenom}-${contact.nom}`;
    return pdfResponse(Buffer.from(buffer), `${slugify(modele.nom)}-${slugify(nomClient)}`);
  },
);
