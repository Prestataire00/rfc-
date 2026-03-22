"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="bg-gray-900 rounded-2xl p-4 inline-block mb-4">
              <Image src="/logo-icon.svg" alt="RFC" width={72} height={72} className="mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-100">Rescue Formation Conseil</h1>
            <p className="text-sm text-gray-400 mt-1">{"S\u00e9curit\u00e9 - Incendie - Pr\u00e9vention"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-600 bg-gray-700 text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="Votre mot de passe"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-400 text-center">Comptes de demo :</p>
            <div className="mt-2 space-y-1 text-xs text-gray-400 text-center">
              <p><strong>Admin :</strong> admin@formapro.fr / admin123</p>
              <p><strong>Formateur :</strong> formateur@formapro.fr / formateur123</p>
              <p><strong>Client :</strong> client@formapro.fr / client123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
