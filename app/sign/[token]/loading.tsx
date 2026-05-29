// Skeleton affiché pendant le SSR de /sign/[token] — évite l'écran blanc
// pendant que le serveur fait verifyToken → rate-limit → findUnique →
// éventuelle transition viewed → getSignedUrl (typiquement 500ms-1s).

export default function SignLoading() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="h-7 w-3/4 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse mb-1" />
      <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="border border-gray-300 rounded p-12 flex items-center justify-center min-h-[400px] bg-white">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <span className="text-sm">Préparation du document à signer…</span>
        </div>
      </div>
      <div className="mt-6 border-t pt-4 space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
