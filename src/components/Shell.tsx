"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Products" },
  { href: "/categories", label: "Categories" },
];

// Wraps every signed-in page: redirects to the login page when there is no admin session.
export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <p className="p-8 text-foreground/60">Loading…</p>;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-foreground/15 md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <p className="font-display text-lg font-bold leading-tight">
            Square Market
            <span className="block text-xs font-normal text-foreground/60">Dashboard</span>
          </p>
        </div>
        <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" || pathname.startsWith("/products") : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 text-sm ${active ? "bg-accent font-medium text-white" : "hover:bg-foreground/5"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-5 py-6 text-sm md:block">
          <p className="truncate text-foreground/60">{user.email}</p>
          <button onClick={signOut} className="mt-2 hover:text-accent">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
