"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import VendorOrders from "@/components/VendorOrders";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Row = {
  orderNumber: string;
  customer: string;
  total: number;
  status: string;
  needsAttention?: string;
  createdAt: string;
  itemCount: number;
};

const TABS = [
  { value: "open", label: "To do" },
  { value: "attention", label: "Needs attention" },
  { value: "done", label: "Finished" },
  { value: "all", label: "All" },
];

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const PILL: Record<string, string> = {
  Delivered: "bg-[#DCFCE7] text-[#14532D]",
  Cancelled: "bg-surface text-muted",
  "Awaiting payment": "bg-surface text-foreground",
  "Needs attention": "bg-[#FEF3F2] text-[#B42318]",
  New: "bg-accent text-foreground",
};

const th = "px-4 py-3 font-semibold first:pl-6 last:pr-6";
const td = "px-4 py-3.5 first:pl-6 last:pr-6";

export default function OrdersPage() {
  return (
    <Shell>
      <RoleOrders />
    </Shell>
  );
}

// Vendors see their own shipments; the store owner sees every order.
function RoleOrders() {
  const { user } = useAuth();
  return user?.role === "vendor" ? <VendorOrders /> : <Orders />;
}

function Orders() {
  const { token } = useAuth();
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<{ open: number; attention: number } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<{ orders: Row[]; counts: { open: number; attention: number } }>(`/admin/orders?filter=${filter}`, { token });
      setRows(res.orders);
      setCounts(res.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    }
  }, [token, filter]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[32px] font-bold tracking-[-0.02em]">Orders</h1>

      <div role="group" aria-label="Order filter" className="inline-flex flex-wrap self-start rounded-sm border border-[#C6C6CB] bg-white">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setRows(null);
              setFilter(t.value);
            }}
            className={`min-h-11 cursor-pointer px-4 text-sm ${
              filter === t.value ? "bg-foreground font-semibold text-white" : "bg-transparent font-medium"
            }`}
          >
            {t.label}
            {t.value === "open" && counts ? ` (${counts.open})` : ""}
            {t.value === "attention" && counts && counts.attention > 0 ? ` (${counts.attention})` : ""}
          </button>
        ))}
      </div>

      <ErrorText message={error} />

      <section className="rounded-sm border border-line bg-white">
        {rows === null ? (
          !error && <p className="px-6 py-5 text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-5 text-sm text-[#45474B]">
            {filter === "open" ? "Nothing to do right now." : "No orders here."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="bg-[#F3F4F5] text-left">
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Items</th>
                  <th className={th}>Placed</th>
                  <th className={th}>Total</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.orderNumber} className="border-t border-line">
                    <td className={td}>
                      <Link href={`/orders/${o.orderNumber}`} className="font-semibold text-accent-ink hover:text-foreground">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className={td}>{o.customer}</td>
                    <td className={`${td} text-[#45474B]`}>{o.itemCount}</td>
                    <td className={`${td} text-[#45474B]`}>
                      {new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                    </td>
                    <td className={`${td} font-display text-base font-bold`}>{naira.format(o.total)}</td>
                    <td className={td}>
                      <span
                        title={o.needsAttention}
                        className={`inline-block rounded-sm px-2.5 py-1 text-[13px] font-semibold ${PILL[o.status] ?? "bg-[#FBEAE4] text-[#8A3219]"}`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
