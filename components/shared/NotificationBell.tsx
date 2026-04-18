"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Notification = {
  id: string;
  createdAt: string;
  titre: string;
  message: string;
  type: string;
  lien: string | null;
  lu: boolean;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  async function fetchNotifs() {
    const res = await fetch("/api/notifications?limit=20");
    if (res.ok) {
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifs.filter((n) => !n.lu).length;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lu: true }) });
    fetchNotifs();
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    fetchNotifs();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-800 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-50">
            <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-red-400 hover:text-red-300">
                  Tout marquer lu
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Aucune notification</div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${!n.lu ? "bg-gray-800/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {n.lien ? (
                        <Link href={n.lien} onClick={() => { markRead(n.id); setOpen(false); }}>
                          <p className="text-sm font-medium text-gray-100 hover:text-red-400">{n.titre}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        </Link>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-100">{n.titre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                        </>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!n.lu && (
                      <button onClick={() => markRead(n.id)} className="p-1 rounded hover:bg-gray-700 shrink-0" title="Marquer lu">
                        <Check className="h-3 w-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
