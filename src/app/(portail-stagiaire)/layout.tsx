import { AppShell } from "@/components/layout/app-shell";

export default function StagiaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell requiredRole="STAGIAIRE">{children}</AppShell>;
}
