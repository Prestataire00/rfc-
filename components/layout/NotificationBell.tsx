"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface Notification {
  id: string;
  createdAt: string;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  lien: string | null;
}

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-red-500", bg: "bg-red-900/20" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-900/20" },
  success: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-900/20" },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-900/20" },
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

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

  const recentNotifications = notifications.slice(0, 8);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-900/200 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-gray-700 bg-gray-800 shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-400 font-medium"
              >
                <Check className="h-3 w-3" />
                Marquer tout comme lu
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Aucune notification</p>
              </div>
            ) : (
              recentNotifications.map((notif) => {
                const config = typeConfig[notif.type] || typeConfig.info;
                const Icon = config.icon;

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-700 transition-colors cursor-pointer",
                      !notif.lu && "border-l-2 border-l-red-500 bg-red-900/20/30"
                    )}
                    onClick={() => {
                      if (!notif.lu) markAsRead(notif.id);
                      if (notif.lien) {
                        setOpen(false);
                        window.location.href = notif.lien;
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center",
                        config.bg
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          !notif.lu ? "font-semibold text-gray-100" : "font-medium text-gray-300"
                        )}
                      >
                        {notif.titre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatRelative(notif.createdAt)}
                      </p>
                    </div>
                    {notif.lien && (
                      <ExternalLink className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-red-600 hover:text-red-400"
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
