"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-100">
          Une erreur est survenue
        </h1>
        <p className="mb-6 text-gray-400">
          {"Quelque chose s'est mal passé. Veuillez réessayer ou retourner à l'accueil."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
          >
            {"Réessayer"}
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-700"
          >
            {"Retour à l'accueil"}
          </Link>
        </div>
      </div>
    </div>
  );
}
