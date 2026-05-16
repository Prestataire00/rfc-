// Redirect permanent vers la page prospect unifiée.
// /demandes/[id] → /prospects/[id] (Phase 4 : vue unifiée prospect).
// La page d'édition /demandes/[id]/modifier est préservée.
import { permanentRedirect } from "next/navigation";

export default function LegacyDemandePage({ params }: { params: { id: string } }) {
  permanentRedirect(`/prospects/${params.id}`);
}
