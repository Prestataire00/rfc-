import { permanentRedirect } from "next/navigation";

// La page « Modèles IA » a été fusionnée dans /documents (onglet « Modèles IA »)
// pour ne pas éclater la gestion documentaire en deux écrans distincts.
export default function ModelesRedirect(): never {
  permanentRedirect("/documents?tab=ia");
}
