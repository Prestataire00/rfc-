"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

export type ActionItem = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  separator?: boolean;
  hidden?: boolean;
};

export function EntityActions({ actions }: { actions: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = actions.filter((a) => !a.hidden);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-50 py-1">
          {visible.map((action, i) => (
            <div key={i}>
              {action.separator && <div className="my-1 border-t border-gray-700" />}
              <button
                onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors ${
                  action.destructive ? "text-red-400 hover:text-red-300" : "text-gray-300"
                }`}
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
