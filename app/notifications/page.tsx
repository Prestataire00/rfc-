"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Check,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn, formatRelative, formatDatetime } from "@/lib/utils";

interface Notification {
  id: string;
  createdAt: string;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  lien: string | null;
}

type Filter = "toutes" | "non_lues" | "lues";

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-900/20", border: "border-blue-700" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-900/20", border: "border-amber-700" },
  success: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-900/20", border: "border-green-700" },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-900/20", border: "border-red-700" },
};

const filters: { key: Filter; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "non_lues", label: "Non lues" },
  { key: "lues", label: "Lues" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<Filter>("toutes");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    setUnreadCount(0);
  };

  const filtered = notifications.filter((n) => {
    if (filter === "non_lues") return !n.lu;
    if (filter === "lues") return n.lu;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Toutes les notifications sont lues"}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-700 p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-gray-800 text-gray-100 shadow-sm"
                  : "text-gray-400 hover:text-gray-100"
              )}
            >
              {f.label}
              {f.key === "non_lues" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-900/30 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mark all as read */}
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 rounded-md bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Marquer tout comme lu
          </button>
        )}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-600 bg-gray-800 py-16 text-center">
          <Bell className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-100">Aucune notification</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === "non_lues"
              ? "Toutes vos notifications ont ete lues"
              : filter === "lues"
              ? "Aucune notification lue"
              : "Vous n'avez pas encore de notifications"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const config = typeConfig[notif.type] || typeConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={notif.id}
                className={cn(
                  "flex gap-4 rounded-xl border bg-gray-800 p-4 transition-colors",
                  !notif.lu
                    ? "border-l-4 border-l-red-500 border-t border-r border-b border-gray-700"
                    : "border-gray-700"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                    config.bg
                  )}
                >
                  <Icon className={cn("h-5 w-5", config.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        !notif.lu ? "font-semibold text-gray-100" : "font-medium text-gray-300"
                      )}
                    >
                      {notif.titre}
                    </p>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {formatDatetime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{notif.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{formatRelative(notif.createdAt)}</span>
                    {notif.lien && (
                      <a
                        href={notif.lien}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-400"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir
                      </a>
                    )}
                    {!notif.lu && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-300"
                      >
                        <Check className="h-3 w-3" />
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
