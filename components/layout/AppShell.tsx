"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu, Sun, Moon } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { useTheme } from "@/components/providers/ThemeProvider";

const PUBLIC_PATHS = ["/login", "/evaluation", "/inscription-stagiaire"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="Basculer le thème"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      )}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-[#262626]">
      <Sidebar
        role={session.user.role}
        userName={session.user.name}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="flex-1 lg:ml-64 min-h-screen overflow-x-hidden">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/logo-rfc.png" alt="RFC" width={34} height={34} className="rounded dark:invert-0 invert dark:hue-rotate-0 hue-rotate-180 dark:brightness-100 brightness-[0.85]" />
              <span className="font-bold text-black dark:text-white text-sm">RFC</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-end border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#262626] px-6 gap-2">
          <ThemeToggle />
          <NotificationBell />
        </div>
        <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}
