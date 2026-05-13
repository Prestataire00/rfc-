export default function ExpiredPage() {
  return (
    <div className="container mx-auto p-12 max-w-md text-center">
      <h1 className="text-2xl font-bold mb-4">Lien expiré ou invalide</h1>
      <p className="text-gray-600">
        Ce lien de signature n&apos;est plus valide. Si vous pensez qu&apos;il s&apos;agit
        d&apos;une erreur, contactez l&apos;expéditeur du document pour qu&apos;il vous
        renvoie un nouveau lien.
      </p>
    </div>
  );
}
