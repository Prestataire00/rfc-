import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Users,
  Building2,
  UserCheck,
  BarChart3,
  Home,
  Calendar,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNav: NavItem[] = [
  { label: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { label: "Formations", href: "/formations", icon: GraduationCap },
  { label: "Devis", href: "/devis", icon: FileText },
  { label: "Formateurs", href: "/formateurs", icon: Users },
  { label: "Clients", href: "/clients", icon: Building2 },
  { label: "Stagiaires", href: "/stagiaires", icon: UserCheck },
  { label: "BPF", href: "/bpf", icon: BarChart3 },
];

export const formateurNav: NavItem[] = [
  { label: "Accueil", href: "/portail-formateur", icon: Home },
  { label: "Disponibilités", href: "/portail-formateur/disponibilites", icon: Calendar },
  { label: "Mes Sessions", href: "/portail-formateur/sessions", icon: GraduationCap },
  { label: "Documents", href: "/portail-formateur/documents", icon: FolderOpen },
];

export const clientNav: NavItem[] = [
  { label: "Accueil", href: "/portail-client", icon: Home },
  { label: "Mes Formations", href: "/portail-client/formations", icon: GraduationCap },
  { label: "Documents", href: "/portail-client/documents", icon: FolderOpen },
];

export const stagiaireNav: NavItem[] = [
  { label: "Accueil", href: "/portail-stagiaire", icon: Home },
  { label: "Mes Formations", href: "/portail-stagiaire/formations", icon: GraduationCap },
  { label: "Documents", href: "/portail-stagiaire/documents", icon: FolderOpen },
];

export function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case "ADMIN":
      return adminNav;
    case "FORMATEUR":
      return formateurNav;
    case "CLIENT":
      return clientNav;
    case "STAGIAIRE":
      return stagiaireNav;
    default:
      return [];
  }
}
