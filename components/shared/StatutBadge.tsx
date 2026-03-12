import { cn } from "@/lib/utils";

interface StatutBadgeProps {
  label: string;
  color: string;
  className?: string;
}

export function StatutBadge({ label, color, className }: StatutBadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", color, className)}>
      {label}
    </span>
  );
}
