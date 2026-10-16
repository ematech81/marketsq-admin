"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import NotificationBell from "./NotificationBell";

const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";

// The store owner and vendors see different menus.
const ADMIN_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/vendors", label: "Vendors" },
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products" },
  { href: "/earnings", label: "Earnings" },
  { href: "/payouts", label: "Payouts" },
  { href: "/banners", label: "Home banners" },
  { href: "/categories", label: "Categories" },
  { href: "/delivery", label: "Delivery fees" },
  { href: "/settings", label: "Settings" },
];

const VENDOR_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/products", label: "Products" },
  { href: "/delivery", label: "Delivery" },
  { href: "/wallet", label: "Wallet" },
];

// Wraps every signed-in page: redirects to the login page when there is no session.
export default function Shell({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, token, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [badges, setBadges] = useState<Record<string, number>>({});
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // The orange numbers: things waiting for you.
  useEffect(() => {
    if (!token || !user) return;
    const jobs = isAdmin
      ? [
          api<{ vendors: unknown[] }>("/admin/vendors?status=pending", { token }).then((v) => ["/vendors", v.vendors.length] as const),
          api<{ counts: { toConfirm: number } }>("/admin/orders?filter=open", { token }).then((o) => ["/orders", o.counts.toConfirm] as const),
          api<{ payouts: unknown[] }>("/admin/payouts?status=requested", { token }).then((p) => ["/payouts", p.payouts.length] as const),
          api<{ products: unknown[] }>("/admin/products?status=pending", { token }).then((p) => ["/products", p.products.length] as const),
        ]
      : [api<{ counts: { toConfirm: number } }>("/vendor/orders?filter=open", { token }).then((o) => ["/orders", o.counts.toConfirm] as const)];
    Promise.all(jobs)
      .then((rows) => setBadges(Object.fromEntries(rows)))
      .catch(() => setBadges({}));
  }, [token, user, isAdmin, pathname]);

  if (loading || !user) return <p className="p-8 text-muted">Loading…</p>;

  const links = isAdmin ? ADMIN_LINKS : VENDOR_LINKS;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-foreground text-white">
        <div className="flex min-h-15 items-center justify-between gap-3 px-6 py-2.5">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
            <span className="inline-block size-3.5 bg-accent" aria-hidden />
            Square Market
            <span className="font-sans text-[13px] font-medium text-[#D5D8DC]">{isAdmin ? "Admin" : "Vendor"}</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <NotificationBell />
            <a href={STORE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-white">
              View store
            </a>
            <button onClick={signOut} className="inline-flex min-h-11 cursor-pointer items-center text-white">
              Sign out
            </button>
            <span className="hidden text-right leading-tight sm:block">
              <span className="block max-w-56 truncate text-[13px]">{user.email}</span>
              <span className="block text-[11px] font-semibold tracking-wide text-accent uppercase">{isAdmin ? "Store owner (admin)" : "Vendor account"}</span>
            </span>
            <span title={user.email} className="flex size-9 items-center justify-center bg-accent text-sm font-bold text-foreground">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-stretch md:flex-row">
        <nav
          aria-label={isAdmin ? "Admin" : "Vendor"}
          className="flex flex-row flex-wrap gap-0.5 border-b border-line bg-white p-4 md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0"
        >
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            const count = badges[l.href] ?? 0;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex min-h-11 items-center justify-between border-l-[3px] px-3 text-[15px] text-foreground ${
                  active ? "border-accent bg-background font-semibold" : "border-transparent font-medium hover:bg-background"
                }`}
              >
                <span>{l.label}</span>
                {count > 0 && (
                  <span className="ml-3 inline-flex h-5 min-w-5 items-center justify-center bg-accent px-1.5 text-xs font-bold">{count}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 px-6 pt-8 pb-14">
          {adminOnly && !isAdmin ? (
            <p className="rounded-sm border border-line bg-white p-6 text-[15px]">This page is for the store owner.</p>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
