import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Politique de confidentialite — Rescue Formation Conseil",
};

const ORG_NAME = "RFC - Rescue Formation Conseil";
const CONTACT_DPO = "dpo@rescueformation83.fr";

export default function PolitiqueConfidentialitePage() {
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
        <h1 className="text-3xl font-bold mb-2">Politique de confidentialite</h1>
        <p className="text-sm text-gray-500 mb-8">
          {ORG_NAME} accorde une importance majeure a la protection des donnees
          personnelles, conformement au Reglement General sur la Protection des
          Donnees (RGPD) et a la loi Informatique et Libertes.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Donnees collectees</h2>
            <p>Nous collectons les donnees suivantes :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>
                <strong>Identification :</strong> nom, prenom, email, telephone,
                adresse postale, date de naissance.
              </li>
              <li>
                <strong>Professionnelles :</strong> entreprise, poste, niveau de
                formation, besoins d&apos;adaptation (RQTH).
              </li>
              <li>
                <strong>Reglementaires :</strong> numero de Securite sociale, numero
                de passeport prevention (article D.4163-1 du Code du travail).
              </li>
              <li>
                <strong>Pedagogiques :</strong> resultats d&apos;evaluation,
                attestations, signatures d&apos;emargement.
              </li>
              <li>
                <strong>Techniques :</strong> logs de connexion, adresses IP, donnees
                de navigation.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Finalites du traitement</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Gestion des inscriptions et du parcours de formation.</li>
              <li>
                Edition des documents reglementaires Qualiopi (convocations,
                attestations, feuilles d&apos;emargement).
              </li>
              <li>Suivi commercial et facturation.</li>
              <li>Communication avec les apprenants, formateurs et entreprises.</li>
              <li>Etablissement des statistiques BPF (bilan pedagogique financier).</li>
              <li>
                Securisation du portail et lutte contre les acces non autorises.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Bases legales</h2>
            <p>Les traitements reposent sur :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>
                L&apos;execution du contrat de formation (article 6.1.b du RGPD).
              </li>
              <li>
                Le respect d&apos;obligations legales (Qualiopi, BPF, declaration
                d&apos;activite, conservation comptable).
              </li>
              <li>
                Le consentement explicite pour les communications marketing.
              </li>
              <li>
                L&apos;interet legitime pour la securisation et l&apos;amelioration du
                service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Duree de conservation</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Donnees pedagogiques : 10 ans (obligation Qualiopi).</li>
              <li>Donnees comptables et factures : 10 ans.</li>
              <li>Donnees prospects sans suite : 3 ans apres dernier contact.</li>
              <li>
                Donnees de connexion / logs : 1 an, conformement aux exigences LCEN.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Destinataires</h2>
            <p>
              Les donnees sont accessibles aux equipes habilitees de {ORG_NAME}, aux
              formateurs intervenants pour la session concernee et aux organismes
              financeurs (OPCO, CPF). Aucune donnee n&apos;est cedee ou vendue a des
              tiers a des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Vos droits</h2>
            <p>Conformement au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>Droit d&apos;acces a vos donnees.</li>
              <li>Droit de rectification.</li>
              <li>Droit a l&apos;effacement (sous reserve des obligations legales).</li>
              <li>Droit a la portabilite.</li>
              <li>Droit d&apos;opposition au traitement.</li>
              <li>Droit de definir des directives post-mortem.</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, utilisez notre{" "}
              <Link href="/rgpd/demande" className="text-red-600 hover:underline">
                formulaire de demande RGPD
              </Link>{" "}
              ou ecrivez a{" "}
              <a href={`mailto:${CONTACT_DPO}`} className="text-red-600 hover:underline">
                {CONTACT_DPO}
              </a>
              . Vous pouvez egalement deposer une reclamation aupres de la CNIL{" "}
              (
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline"
              >
                www.cnil.fr
              </a>
              ).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Securite</h2>
            <p>
              {ORG_NAME} met en oeuvre des mesures techniques et organisationnelles
              adaptees pour proteger vos donnees : chiffrement des mots de passe,
              connexion HTTPS, journalisation des acces, sauvegardes regulieres et
              cloisonnement des roles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p>
              Le portail utilise uniquement des cookies techniques necessaires a la
              session utilisateur (authentification). Aucun cookie publicitaire ou de
              suivi tiers n&apos;est depose sans votre consentement explicite.
            </p>
          </section>
        </div>

        <nav className="mt-12 pt-6 border-t border-gray-200 text-sm flex flex-wrap gap-4">
          <Link href="/legal/mentions-legales" className="text-red-600 hover:underline">
            Mentions legales
          </Link>
          <Link href="/legal/cgu" className="text-red-600 hover:underline">
            Conditions generales d&apos;utilisation
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
