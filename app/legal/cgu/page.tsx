import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "CGU — Rescue Formation Conseil",
};

const ORG_NAME = "RFC - Rescue Formation Conseil";

export default function CguPage() {
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
        <h1 className="text-3xl font-bold mb-2">Conditions generales d&apos;utilisation</h1>
        <p className="text-sm text-gray-500 mb-8">
          Les presentes conditions generales d&apos;utilisation (les &laquo; CGU &raquo;)
          regissent l&apos;acces et l&apos;utilisation du portail CRM de {ORG_NAME}.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Objet</h2>
            <p>
              Les CGU ont pour objet de definir les modalites et conditions
              d&apos;utilisation des services proposes sur le portail (gestion des
              formations, des sessions, des inscriptions, des documents qualite,
              espaces formateur et client).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Acces au service</h2>
            <p>
              L&apos;acces au portail est reserve aux utilisateurs autorises par {ORG_NAME}
              (administrateurs internes, formateurs partenaires, entreprises clientes
              et stagiaires inscrits). L&apos;acces est gratuit, hors cout de connexion
              a Internet.
            </p>
            <p className="mt-2">
              {ORG_NAME} se reserve le droit de suspendre ou interrompre l&apos;acces
              au service sans preavis pour des operations de maintenance, en cas de
              force majeure ou de manquement aux presentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Comptes utilisateurs</h2>
            <p>
              Chaque utilisateur dispose d&apos;un compte personnel protege par un mot
              de passe confidentiel. L&apos;utilisateur est seul responsable de la
              preservation de la confidentialite de ses identifiants et de toutes les
              actions effectuees depuis son compte. Toute utilisation frauduleuse doit
              etre signalee immediatement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Propriete intellectuelle</h2>
            <p>
              L&apos;ensemble des elements composant le portail (interfaces, logos,
              codes source, supports pedagogiques, documents qualite) est protege par
              le droit de la propriete intellectuelle. Toute reproduction ou
              representation, totale ou partielle, est interdite sans autorisation
              ecrite prealable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Donnees personnelles</h2>
            <p>
              Le traitement des donnees personnelles est detaille dans la{" "}
              <Link
                href="/legal/politique-confidentialite"
                className="text-red-600 hover:underline"
              >
                politique de confidentialite
              </Link>
              . En utilisant le service, vous acceptez les pratiques qui y sont
              decrites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Responsabilite</h2>
            <p>
              {ORG_NAME} s&apos;efforce d&apos;assurer la disponibilite et la fiabilite
              du portail mais ne saurait etre tenu responsable des dommages indirects,
              perte de donnees ou interruption de service resultant d&apos;une
              utilisation non conforme du portail, d&apos;une defaillance du reseau
              Internet ou d&apos;un cas de force majeure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Modification des CGU</h2>
            <p>
              {ORG_NAME} se reserve le droit de modifier a tout moment les presentes
              CGU. Les utilisateurs seront informes des modifications par courriel ou
              par affichage sur le portail. La poursuite de l&apos;utilisation du
              service apres notification vaut acceptation des nouvelles CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Loi applicable et juridiction</h2>
            <p>
              Les presentes CGU sont regies par la loi francaise. Tout litige relatif
              a leur execution sera soumis a la competence exclusive des juridictions
              francaises.
            </p>
          </section>
        </div>

        <nav className="mt-12 pt-6 border-t border-gray-200 text-sm flex flex-wrap gap-4">
          <Link href="/legal/mentions-legales" className="text-red-600 hover:underline">
            Mentions legales
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
          {ORG_NAME} — Conformite Qualiopi
        </div>
      </footer>
    </div>
  );
}
