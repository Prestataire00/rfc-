"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";

const PUBLIC_PATHS = ["/login", "/evaluation", "/inscription-stagiaire"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role={session.user.role}
        userName={session.user.name}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="flex-1 lg:ml-64 min-h-screen">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="FormaPro" width={28} height={28} className="rounded-lg" />
              <span className="font-semibold text-gray-900 text-sm">FormaPro</span>
            </div>
          </div>
          <NotificationBell />
        </div>
        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-30 items-center justify-end border-b bg-white px-6 py-2.5">
          <NotificationBell />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
