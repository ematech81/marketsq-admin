"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import VendorTable, { type VendorRow } from "@/components/VendorTable";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Overview = {
  kpis: { sales: number; orders: number; activeVendors: number; applicationsToReview: number };
  applications: VendorRow[];
  recentOrders: { orderNumber: string; customer: string; total: number; status: string; needsAttention?: string; createdAt: string }[];
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const PILL: Record<string, string> = {
  Delivered: "bg-[#DCFCE7] text-[#14532D]",
  "Awaiting payment": "bg-surface text-foreground",
  "Needs attention": "bg-[#FEF3F2] text-[#B42318]",
  Cancelled: "bg-surface text-muted",
  New: "bg-accent text-foreground",
};

const panel = "rounded-sm border border-line bg-white";
const panelHead = "flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-5";
const th = "px-4 py-3 font-semibold first:pl-6 last:pr-6";
const td = "px-4 py-3.5 first:pl-6 last:pr-6";

export default function OverviewPage() {
  return (
    <Shell>
      <Content />
    </Shell>
  );
}

function Content() {
  const { token } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<Overview>("/admin/overview", { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the overview");
    }
  }, [token]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const kpis = data
    ? [
        { label: "Sales", value: naira.format(data.kpis.sales), bar: "border-t-foreground" },
        { label: "Orders", value: String(data.kpis.orders), bar: "border-t-foreground" },
        { label: "Active vendors", value: String(data.kpis.activeVendors), bar: "border-t-foreground" },
        { label: "Applications to review", value: String(data.kpis.applicationsToReview), bar: "border-t-accent" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[32px] font-bold tracking-[-0.02em]">Overview</h1>
      <ErrorText message={error} />
      {!data ? (
        !error && <p className="text-muted">Loading…</p>
      ) : (
        <>
          <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {kpis.map((k) => (
              <div key={k.label} className={`flex flex-col gap-2 rounded-sm border border-t-[3px] border-line bg-white p-5 ${k.bar}`}>
                <span className="text-sm text-[#45474B]">{k.label}</span>
                <span className="font-display text-3xl font-bold">{k.value}</span>
              </div>
            ))}
          </section>

          <section className={panel}>
            <div className={panelHead}>
              <div>
                <h2 className="font-display text-[22px] font-semibold">Vendor applications</h2>
                <p className="mt-1 text-sm text-[#45474B]">
                  {data.applications.length === 0 ? "Nothing waiting for review" : `${data.applications.length} waiting for review`}
                </p>
              </div>
              <Link href="/vendors" className="text-sm font-semibold text-accent-ink hover:text-foreground">
                View all vendors
              </Link>
            </div>
            {data.applications.length > 0 && <VendorTable rows={data.applications} onChanged={load} />}
          </section>

          <section className={panel}>
            <div className={panelHead}>
              <h2 className="font-display text-[22px] font-semibold">Recent orders</h2>
              <Link href="/orders" className="text-sm font-semibold text-accent-ink hover:text-foreground">
                View all orders
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="px-6 py-5 text-sm text-[#45474B]">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F3F4F5] text-left">
                      <th className={th}>Order</th>
                      <th className={th}>Customer</th>
                      <th className={th}>Placed</th>
                      <th className={th}>Total</th>
                      <th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.orderNumber} className="border-t border-line">
                        <td className={td}>
                          <Link href={`/orders/${o.orderNumber}`} className="font-semibold text-accent-ink hover:text-foreground">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className={td}>{o.customer}</td>
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
        </>
      )}
    </div>
  );
}
