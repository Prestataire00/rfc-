import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Résout le `formateurId` du user connecté, en l'auto-créant si nécessaire.
 *
 * Cas d'usage : un compte User avec role="formateur" mais sans fiche
 * Formateur liée (User.formateurId = null) ne peut rien faire dans son
 * espace (disponibilités, notes de frais, sessions…). Cette fonction
 * crée silencieusement la fiche à partir des infos User (nom/prénom/
 * email) et relie les deux, pour que le formateur soit fonctionnel sans
 * intervention admin.
 *
 * Idempotent : si Formateur.email existe déjà (cas où l'admin avait créé
 * la fiche mais oublié de la lier au User), on upsert et on lie.
 *
 * Retourne null si :
 *   - pas de session
 *   - role != "formateur"
 *   - le User n'existe plus
 */
export async function ensureFormateurId(session: {
  user?: {
    id?: string;
    role?: string;
    formateurId?: string | null;
  } | null;
} | null): Promise<string | null> {
  if (!session?.user?.id) return null;
  if (session.user.formateurId) return session.user.formateurId;
  if (session.user.role !== "formateur") return null;

  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, nom: true, prenom: true, email: true, formateurId: true },
  });
  if (!userData) return null;
  // Race condition : un autre tab a peut-être déjà lié entre temps
  if (userData.formateurId) return userData.formateurId;

  // Upsert par email — gère le cas où une fiche Formateur orpheline
  // existait déjà avec le même email (créée par un admin sans avoir lié
  // au User). On lie au User après création/upsert.
  const formateur = await prisma.formateur.upsert({
    where: { email: userData.email },
    update: {},
    create: {
      nom: userData.nom,
      prenom: userData.prenom,
      email: userData.email,
      actif: true,
    },
    select: { id: true },
  });

  await prisma.user
    .update({
      where: { id: userData.id },
      data: { formateurId: formateur.id },
    })
    .catch(() => {
      // Si User.formateurId est unique et déjà pris par un autre user (cas
      // rare : deux comptes formateur partageant la même fiche), on ignore.
      // Le formateurId retourné reste valide pour cette requête.
    });

  return formateur.id;
}
