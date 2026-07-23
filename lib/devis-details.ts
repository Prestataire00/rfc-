import { prisma } from "@/lib/prisma";

// Bloc « Détails de la formation » affiché sur le devis, dérivé automatiquement
// des données recueillies : formation liée, session (ou dates souhaitées),
// nombre de stagiaires, durée. Utilisé par les routes de rendu du devis PDF.
export type DevisFormationDetails = {
  intitule?: string;
  nbApprenants?: number;
  nbHeures?: string; // ex "07h00"
  nbJours?: number;
  dateTexte?: string; // ex "le 03/08/2026" ou "du 03/08/2026 au 04/08/2026"
  lieu?: string;
};

const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR");

export async function resolveDevisDetails(devisId: string): Promise<DevisFormationDetails | null> {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: {
      lignes: { select: { quantite: true } },
      entreprise: { select: { adresse: true, codePostal: true, ville: true } },
      sessions: { select: { dateDebut: true, dateFin: true, lieu: true }, orderBy: { dateDebut: "asc" } },
      demandes: {
        select: { id: true, formationId: true, nbStagiaires: true, datesSouhaitees: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!devis) return null;

  const demande = devis.demandes[0];
  const formation = demande?.formationId
    ? await prisma.formation.findUnique({ where: { id: demande.formationId }, select: { titre: true, duree: true } })
    : null;

  // Nombre d'apprenants : priorité au nb saisi sur la demande, sinon quantité de ligne.
  const nbApprenants =
    demande?.nbStagiaires ?? (devis.lignes.length > 0 ? Math.max(...devis.lignes.map((l) => l.quantite)) : undefined);

  // Nombre d'heures = durée de la formation (heures entières), formaté "07h00".
  const nbHeures = formation?.duree != null ? `${String(formation.duree).padStart(2, "0")}h00` : undefined;

  const session = devis.sessions[0];
  let dateTexte: string | undefined;
  let nbJours: number | undefined;
  let lieu: string | undefined = session?.lieu || undefined;

  if (session) {
    const dd = fmtDate(session.dateDebut);
    const df = fmtDate(session.dateFin);
    dateTexte = dd === df ? `le ${dd}` : `du ${dd} au ${df}`;
    nbJours = Math.max(1, Math.round((session.dateFin.getTime() - session.dateDebut.getTime()) / 86400000) + 1);
  } else if (demande?.datesSouhaitees) {
    // Dates souhaitées (chaîne lisible "03/08/2026, 05/08/2026" propagée depuis la fiche).
    const parts = demande.datesSouhaitees.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      dateTexte = parts.length === 1 ? `le ${parts[0]}` : parts.join(", ");
      nbJours = parts.length;
    }
  }

  // Lieu : session en priorité, sinon lieu souhaité sur la fiche, sinon adresse entreprise.
  if (!lieu && demande) {
    const fiche = await prisma.fichePreFormationEntreprise.findFirst({
      where: { demandeId: demande.id, lieuFormationSouhaite: { not: null } },
      select: { lieuFormationSouhaite: true },
      orderBy: { createdAt: "desc" },
    });
    lieu = fiche?.lieuFormationSouhaite || undefined;
  }
  if (!lieu && devis.entreprise) {
    lieu = [devis.entreprise.adresse, devis.entreprise.codePostal, devis.entreprise.ville].filter(Boolean).join(" ") || undefined;
  }

  // Si aucune donnée exploitable, ne pas afficher de bloc vide.
  if (!formation && !nbApprenants && !nbHeures && !dateTexte && !lieu) return null;

  return {
    intitule: formation?.titre,
    nbApprenants,
    nbHeures,
    nbJours,
    dateTexte,
    lieu,
  };
}
