"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { actionIcon, actionColor, formatRelative, type HistoriqueAction } from "./types";

type Props = {
  historique: HistoriqueAction[];
  historiqueLoading: boolean;
};

export function HistoriqueTimeline({ historique, historiqueLoading }: Props) {
  return (
    <div>
      {historiqueLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      ) : historique.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="h-8 w-8 text-gray-500 mb-3" />
          <p className="text-sm text-gray-400">Aucune activité enregistrée</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-700" />
          <div className="space-y-4 pl-14">
            {historique.map((h) => {
              const Icon = actionIcon(h.action);
              const colorClass = actionColor(h.action);
              return (
                <div key={h.id} className="relative">
                  <div className={`absolute -left-9 h-8 w-8 rounded-full border flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {h.lien ? (
                          <Link href={h.lien} className="font-medium text-gray-100 hover:text-red-400 text-sm">
                            {h.label}
                          </Link>
                        ) : (
                          <p className="font-medium text-gray-100 text-sm">{h.label}</p>
                        )}
                        {h.detail && (
                          <p className="text-xs text-gray-400 mt-0.5">{h.detail}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className="text-xs text-gray-400 cursor-default"
                          title={new Date(h.createdAt).toLocaleString("fr-FR")}
                        >
                          {formatRelative(h.createdAt)}
                        </span>
                        <p className="text-xs text-gray-500">{formatDate(h.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
