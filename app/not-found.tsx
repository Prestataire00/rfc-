import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <FileQuestion className="h-8 w-8 text-blue-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Page introuvable
        </h1>
        <p className="mb-6 text-gray-500">
          La page que vous recherchez n&apos;existe pas ou a
          &eacute;t&eacute; d&eacute;plac&eacute;e.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Retour &agrave; l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
