import Link from "next/link";
import Image from "next/image";

const ORG = {
  nom: "RFC - Rescue Formation Conseil",
  adresse: "",
  codePostal: "",
  ville: "",
  siret: "",
  nda: "",
  email: "contact@rescueformation83.fr",
  telephone: "",
  siteWeb: "www.rescueformation83.fr",
  directeur: "Direction RFC",
};

export const metadata = {
  title: "Mentions legales — Rescue Formation Conseil",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logorescue.png" alt="RFC" width={36} height={36} className="rounded" />
            <span className="font-bold text-sm">Rescue Formation Conseil</span>
          </Link>
          <Link href="/" className="text-xs text-red-600 hover:underline">
            Retour
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Mentions legales</h1>
        <p className="text-sm text-gray-500 mb-8">
          Informations relatives au site et a son editeur — mises a jour conformement
          a la loi pour la confiance dans l&apos;economie numerique (LCEN).
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Editeur du site</h2>
            <p>
              <strong>{ORG.nom}</strong>
              <br />
              {ORG.adresse && (
                <>
                  {ORG.adresse}, {ORG.codePostal} {ORG.ville}
                  <br />
                </>
              )}
              {ORG.siret && (
                <>
                  SIRET : {ORG.siret}
                  <br />
                </>
              )}
              {ORG.nda && (
                <>
                  Numero de declaration d&apos;activite (NDA) : {ORG.nda}
                  <br />
                </>
              )}
              Email :{" "}
              <a href={`mailto:${ORG.email}`} className="text-red-600 hover:underline">
                {ORG.email}
              </a>
              <br />
              {ORG.telephone && <>Telephone : {ORG.telephone}<br /></>}
              {ORG.siteWeb && (
                <>
                  Site web :{" "}
                  <a
                    href={`https://${ORG.siteWeb}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:underline"
                  >
                    {ORG.siteWeb}
                  </a>
                </>
              )}
            </p>
            <p className="mt-2">Directeur de la publication : {ORG.directeur}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Hebergeur</h2>
            <p>
              Netlify, Inc.
              <br />
              512 2nd Street, Suite 200, San Francisco, CA 94107, Etats-Unis
              <br />
              Site :{" "}
              <a
                href="https://www.netlify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline"
              >
                www.netlify.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Propriete intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu du site (textes, images, logos, graphismes,
              icones) est la propriete exclusive de {ORG.nom} ou de ses partenaires
              et est protege par les lois francaises et internationales relatives a la
              propriete intellectuelle. Toute reproduction, representation,
              modification ou exploitation non autorisee est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Mediateur de la consommation</h2>
            <p>
              Conformement aux articles L.611-1 et suivants du Code de la
              consommation, tout litige relatif a un contrat de formation peut etre
              porte devant un mediateur de la consommation. Les coordonnees de notre
              mediateur sont communiquees sur simple demande a{" "}
              <a href={`mailto:${ORG.email}`} className="text-red-600 hover:underline">
                {ORG.email}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Donnees personnelles</h2>
            <p>
              Le traitement des donnees personnelles est decrit dans notre{" "}
              <Link href="/legal/politique-confidentialite" className="text-red-600 hover:underline">
                politique de confidentialite
              </Link>
              . Vous pouvez exercer vos droits d&apos;acces, de rectification,
              d&apos;effacement, de portabilite et d&apos;opposition en remplissant
              le{" "}
              <Link href="/rgpd/demande" className="text-red-600 hover:underline">
                formulaire de demande RGPD
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Loi applicable</h2>
            <p>
              Les presentes mentions legales sont regies par la loi francaise. Tout
              litige relatif au site sera porte devant les juridictions competentes du
              ressort du siege de l&apos;editeur.
            </p>
          </section>
        </div>

        <nav className="mt-12 pt-6 border-t border-gray-200 text-sm flex flex-wrap gap-4">
          <Link href="/legal/cgu" className="text-red-600 hover:underline">
            Conditions generales d&apos;utilisation
          </Link>
          <Link
            href="/legal/politique-confidentialite"
            className="text-red-600 hover:underline"
          >
            Politique de confidentialite
          </Link>
          <Link href="/rgpd/demande" className="text-red-600 hover:underline">
            Demande RGPD
          </Link>
        </nav>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-gray-500">
          {ORG.nom} — Conformite Qualiopi
        </div>
      </footer>
    </div>
  );
}
