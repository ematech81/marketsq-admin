"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { NotificationRow, useOpenNotification, type AppNotification } from "./NotificationBell";

// The full inbox: everything, newest first.
export default function NotificationsView() {
  const { token, user, loading } = useAuth();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api<{ notifications: AppNotification[]; unread: number }>("/notifications?limit=100", { token })
      .then((r) => {
        setItems(r.notifications);
        setUnread(r.unread);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your notifications"));
  }, [token]);

  const markRead = useCallback((id: string) => {
    setItems((list) => list?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? list);
    setUnread((u) => Math.max(0, u - 1));
  }, []);
  const open = useOpenNotification(token, markRead);

  async function markAll() {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? list);
    setUnread(0);
    await api("/notifications/read-all", { method: "POST", token }).catch(() => undefined);
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!user) {
    return (
      <p>
        <Link href="/signin" className="font-semibold text-accent-ink underline">
          Sign in
        </Link>{" "}
        to see your notifications.
      </p>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Notifications</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-4 text-sm font-semibold hover:border-foreground"
          >
            Mark all as read ({unread})
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-sm border border-[#B42318] bg-[#FEF3F2] px-3 py-2 text-sm text-[#B42318]">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-sm border border-line bg-white">
        {items === null ? (
          !error && <p className="px-5 py-6 text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#45474B]">You have no notifications yet. Updates will show here, and we also email you.</p>
        ) : (
          items.map((n) => <NotificationRow key={n.id} n={n} onOpen={open} />)
        )}
      </section>
      <p className="text-[13px] text-muted">Notifications are kept for 90 days.</p>
    </div>
  );
}
