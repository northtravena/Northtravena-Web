// src/components/Topbar.tsx
// Fixed top bar. Reads the current page title from React Router location.

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { getRouteLabel } from "@/routes/adminRoutes";
import type { ApiUser, Notification } from "@/types/api";

// ─── Firebase notification shape ─────────────────────────────────────────────
interface FbNotification {
  id: string;
  userId?: string;
  userName?: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  read?: boolean;
  createdAt?: string | { _seconds: number; _nanoseconds: number };
}

// ─── Unified shape used in the UI ────────────────────────────────────────────
interface UnifiedNotification {
  key: string;
  source: "mongo" | "firebase";
  mongoId?: string;
  fbId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  userName?: string;
}

function fbTimestamp(ts: FbNotification["createdAt"]): Date {
  if (!ts) return new Date(0);
  if (typeof ts === "object" && "_seconds" in ts)
    return new Date(ts._seconds * 1000);
  const d = new Date(ts as string);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

interface TopbarProps {
  user: ApiUser | null;
  onLogout: () => void;
}

export function Topbar({ user, onLogout }: TopbarProps) {
  const { pathname } = useLocation();
  const pageTitle = getRouteLabel(pathname);

  const [unified, setUnified]           = useState<UnifiedNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  // ── Fetch both notification sources ────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const [mongoResult, fbResult] = await Promise.allSettled([
      api.get<Notification[]>("/notifications"),
      api.get<FbNotification[]>("/firebase/notifications"),
    ]);

    const mongoItems: UnifiedNotification[] =
      mongoResult.status === "fulfilled"
        ? mongoResult.value.map((n) => ({
            key:       `mongo-${n._id}`,
            source:    "mongo" as const,
            mongoId:   n._id,
            title:     n.title,
            message:   n.message,
            read:      n.read,
            createdAt: new Date(n.createdAt),
          }))
        : [];

    const fbItems: UnifiedNotification[] =
      fbResult.status === "fulfilled"
        ? fbResult.value.map((n) => ({
            key:       `fb-${n.id}`,
            source:    "firebase" as const,
            fbId:      n.id,
            title:     n.title ?? "Notification",
            message:   n.message ?? n.body ?? "",
            read:      n.read ?? false,
            createdAt: fbTimestamp(n.createdAt),
            userName:  n.userName,
          }))
        : [];

    const merged = [...mongoItems, ...fbItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    setUnified(merged);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Mark a single notification as read ─────────────────────────────────────
  const markRead = async (item: UnifiedNotification) => {
    if (item.read) return;
    if (item.source === "mongo" && item.mongoId) {
      try {
        await api.patch(`/notifications/${item.mongoId}/read`, {});
      } catch { /* silent */ }
    }
    setUnified((prev) =>
      prev.map((n) => (n.key === item.key ? { ...n, read: true } : n))
    );
  };

  const markAllRead = async () => {
    const unread = unified.filter((n) => !n.read && n.source === "mongo" && n.mongoId);
    await Promise.allSettled(
      unread.map((n) => api.patch(`/notifications/${n.mongoId}/read`, {}))
    );
    setUnified((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = unified.filter((n) => !n.read).length;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      {/* Page title — derived from current route */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">{pageTitle}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-[#8CC63E] rounded-full animate-pulse" />
            <span className="#0D2955">LIVE</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <p className="font-semibold text-gray-900 text-sm">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                {unified.length === 0 ? (
                  <div className="text-center py-10">
                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  unified.slice(0, 20).map((n) => (
                    <button
                      key={n.key}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !n.read ? "bg-emerald-50/60" : ""
                      }`}
                      onClick={() => markRead(n)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1.5">
                          {!n.read ? (
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-transparent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                            <span
                              className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                n.source === "firebase"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {n.source === "firebase" ? "App" : "System"}
                            </span>
                          </div>
                          {n.userName && (
                            <p className="text-xs text-emerald-600 font-medium mt-0.5">{n.userName}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {n.createdAt.getTime() > 0 ? n.createdAt.toLocaleString() : "—"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              {unified.length > 20 && (
                <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">{unified.length - 20} more notifications</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin info + logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.fullName ?? "Admin"}</p>
            <p className="text-xs text-gray-500">{user?.email ?? ""}</p>
          </div>
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
            <AvatarFallback>{user ? getInitials(user.fullName) : "AD"}</AvatarFallback>
          </Avatar>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
