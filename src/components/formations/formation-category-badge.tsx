import { Badge } from "@/components/ui/badge";

const categoryConfig: Record<string, { label: string; className: string }> = {
  BUREAUTIQUE: { label: "Bureautique", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  INFORMATIQUE: { label: "Informatique", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  MANAGEMENT: { label: "Management", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  LANGUES: { label: "Langues", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  SECURITE: { label: "Sécurité", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  REGLEMENTAIRE: { label: "Réglementaire", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  SOFT_SKILLS: { label: "Soft Skills", className: "bg-pink-100 text-pink-800 hover:bg-pink-100" },
  AUTRE: { label: "Autre", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
};

export function FormationCategoryBadge({ category }: { category: string }) {
  const config = categoryConfig[category] ?? categoryConfig.AUTRE;
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
