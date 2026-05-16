// Redirect 301 (permanent) vers la nouvelle URL — backward compat pour
// les emails déjà envoyés avec l'ancien lien. Suppression prévue le 2026-11-16
// (cf. docs/superpowers/specs/2026-05-16-refactor-besoin-design.md).
import { permanentRedirect } from "next/navigation";

export default function LegacyFicheBesoinClientPage({
  params,
}: {
  params: { token: string };
}) {
  permanentRedirect(`/qualiopi/fiche-entreprise/${params.token}`);
}
