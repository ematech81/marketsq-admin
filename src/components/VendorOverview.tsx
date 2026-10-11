"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorText } from "./form";

type Overview = {
  businessName: string;
  balance: number;
  sales: number;
  toConfirm: number;
  openOrders: number;
  products: { live: number; pending: number; draft: number; rejected: number };
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

// The vendor's home screen.
export default function VendorOverview() {
  const { token } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview>("/vendor/overview", { token })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your overview"));
  }, [token]);

  const cards = data
    ? [
        { label: "In your wallet", value: naira.format(data.balance), bar: "border-t-accent", href: "/wallet" },
        { label: "Orders to confirm", value: String(data.toConfirm), bar: data.toConfirm > 0 ? "border-t-accent" : "border-t-foreground", href: "/orders" },
        { label: "Orders in progress", value: String(data.openOrders), bar: "border-t-foreground", href: "/orders" },
        { label: "Products live", value: String(data.products.live), bar: "border-t-foreground", href: "/products" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Overview</h1>
        {data && <p className="mt-1 text-sm text-[#45474B]">{data.businessName}</p>}
      </div>
      <ErrorText message={error} />
      {!data ? (
        !error && <p className="text-muted">Loading…</p>
      ) : (
        <>
          <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {cards.map((c) => (
              <Link key={c.label} href={c.href} className={`flex flex-col gap-2 rounded-sm border border-t-[3px] border-line bg-white p-5 text-foreground ${c.bar}`}>
                <span className="text-sm text-[#45474B]">{c.label}</span>
                <span className="font-display text-3xl font-bold">{c.value}</span>
              </Link>
            ))}
          </section>

          {(data.products.pending > 0 || data.products.rejected > 0) && (
            <section className="rounded-sm border border-line bg-white p-6 text-[15px]">
              {data.products.pending > 0 && <p>{data.products.pending} of your products are waiting for Square Market to approve them.</p>}
              {data.products.rejected > 0 && (
                <p className="text-[#B42318]">
                  {data.products.rejected} {data.products.rejected === 1 ? "product needs" : "products need"} changes.{" "}
                  <Link href="/products" className="font-semibold underline">
                    See what to fix
                  </Link>
                </p>
              )}
            </section>
          )}

          <section className="rounded-sm border border-line bg-white p-6 text-sm text-[#45474B]">
            <p>
              Total sold so far: <strong className="text-foreground">{naira.format(data.sales)}</strong> before commission. You are paid when an order is
              delivered.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
