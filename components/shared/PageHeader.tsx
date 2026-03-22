import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function PageHeader({ title, description, actionLabel, actionHref }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100">{title}</h1>
        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
