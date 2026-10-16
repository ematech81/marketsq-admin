"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

// "5 min ago", "3 h ago", "2 days ago", then the date.
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

// One line of the inbox: unread ones are bold with a dot.
export function NotificationRow({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={`flex w-full cursor-pointer items-start gap-3 border-b border-line px-4 py-3.5 text-left text-foreground last:border-b-0 hover:bg-surface ${n.read ? "" : "bg-[#FFF8F5]"}`}
    >
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-[15px] leading-snug ${n.read ? "font-medium" : "font-bold"}`}>
          {n.title}
          {!n.read && <span className="sr-only"> (unread)</span>}
        </span>
        {n.body && <span className="text-[13px] leading-snug text-[#45474B]">{n.body}</span>}
        <span className="text-[12px] text-muted">{timeAgo(n.createdAt)}</span>
      </span>
    </button>
  );
}

// Opens a notification: marks it read, then goes to the page it is about.
export function useOpenNotification(token: string | null, onRead: (id: string) => void) {
  const router = useRouter();
  return useCallback(
    (n: AppNotification) => {
      if (!n.read) {
        onRead(n.id);
        api(`/notifications/${n.id}/read`, { method: "PATCH", token }).catch(() => undefined);
      }
      if (n.link?.startsWith("/")) router.push(n.link);
    },
    [token, onRead, router],
  );
}

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

// The bell in the header. The number shows how many you have not read; click it to see the latest ones.
export default function NotificationBell() {
  const { token, user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    if (!token) return;
    api<{ unread: number }>("/notifications/unread-count", { token })
      .then((r) => setUnread(r.unread))
      .catch(() => undefined);
  }, [token]);

  // Ask for the count when the page opens, when you come back to the tab, and about once a minute.
  useEffect(() => {
    if (!token) return;
    const first = setTimeout(refreshCount, 0);
    const every = setInterval(() => {
      if (document.visibilityState === "visible") refreshCount();
    }, 60000);
    const onVisible = () => document.visibilityState === "visible" && refreshCount();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, refreshCount]);

  // Closes on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = useCallback((id: string) => {
    setItems((list) => list?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? list);
    setUnread((u) => Math.max(0, u - 1));
  }, []);
  const openOne = useOpenNotification(token, (id) => {
    markRead(id);
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && token) {
      api<{ notifications: AppNotification[]; unread: number }>("/notifications?limit=10", { token })
        .then((r) => {
          setItems(r.notifications);
          setUnread(r.unread);
        })
        .catch(() => setItems([]));
    }
  }

  async function markAll() {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? list);
    setUnread(0);
    await api("/notifications/read-all", { method: "POST", token }).catch(() => undefined);
  }

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-sm border border-transparent text-white hover:border-white focus-visible:border-white focus-visible:outline-none"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] leading-none font-bold text-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="z-50 overflow-hidden rounded-sm border border-line bg-white text-foreground shadow-lg max-md:fixed max-md:inset-x-3 max-md:top-16 md:absolute md:top-full md:right-0 md:mt-1 md:w-96"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="cursor-pointer text-[13px] font-semibold text-accent-ink hover:text-foreground">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items === null ? (
              <p className="px-4 py-6 text-sm text-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#45474B]">You have no notifications yet. Updates about your orders will show here.</p>
            ) : (
              items.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onOpen={(x) => {
                    setOpen(false);
                    openOne(x);
                  }}
                />
              ))
            )}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-accent-ink hover:bg-surface">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
