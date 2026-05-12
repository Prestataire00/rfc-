import type { Metadata } from "next";
import { Inter, Dancing_Script } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });
// Police cursive utilisée par SignatureMethodTabs (rendu signature "tapée")
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-cursive",
});

export const metadata: Metadata = {
  title: "RFC - Rescue Formation Conseil",
  description: "Plateforme de gestion de formation professionnelle",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`light ${dancingScript.variable}`}>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-right" richColors closeButton duration={4000} />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
