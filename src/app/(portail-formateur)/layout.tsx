import { AppShell } from "@/components/layout/app-shell";

export default function FormateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell requiredRole="FORMATEUR">{children}</AppShell>;
}
