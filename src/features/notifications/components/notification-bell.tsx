"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { NotificationItem } from "@/types/database";
import { notificationsApi } from "../api";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list();
      setItems(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore silent polling errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 60000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleMarkRead = async (item: NotificationItem) => {
    if (item.is_read) return;
    try {
      await notificationsApi.markRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore error
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore error
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) loadNotifications();
        }}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative h-8 w-8 rounded-lg border border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-900">
              Inbox {unreadCount > 0 ? `(${unreadCount} unread)` : ""}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
            {loading && items.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">Loading inbox...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No notifications yet.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMarkRead(item)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    item.is_read ? "bg-white hover:bg-zinc-50" : "bg-indigo-50/40 hover:bg-indigo-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-900 leading-snug">
                      {item.title}
                    </span>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  {item.created_at && (
                    <div className="text-[10px] text-zinc-400 mt-1">
                      {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
