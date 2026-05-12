export default function SuccessPage() {
  return (
    <div className="container mx-auto p-12 max-w-md text-center">
      <h1 className="text-2xl font-bold mb-4 text-green-700">Signature enregistrée ✓</h1>
      <p className="text-gray-600 mb-2">
        Merci, votre signature a bien été enregistrée.
      </p>
      <p className="text-gray-500 text-sm">
        Vous recevrez le document signé final et le certificat de preuve par email
        dans les prochaines minutes.
      </p>
    </div>
  );
}
