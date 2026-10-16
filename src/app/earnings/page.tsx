"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Earnings = {
  commission: { allTime: number; thisMonth: number };
  sales: { allTime: number; thisMonth: number; deliveredOrders: number };
  owed: { pending: number; available: number; payoutsRequested: number; payoutsRequestedCount: number };
  openDisputes: number;
  vendors: {
    id: string;
    name: string;
    deliveryMode: "platform" | "self";
    commissionRate: number | null;
    pending: number;
    available: number;
    sales: number;
    commission: number;
    orders: number;
  }[];
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const panel = "rounded-sm border border-line bg-white";
const th = "px-4 py-3 font-semibold first:pl-6 last:pr-6";
const td = "px-4 py-3.5 first:pl-6 last:pr-6";

export default function EarningsPage() {
  return (
    <Shell adminOnly>
      <EarningsView />
    </Shell>
  );
}

function EarningsView() {
  const { token } = useAuth();
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Earnings>("/admin/earnings", { token })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load earnings"));
  }, [token]);

  const card = (label: string, value: string, note: string, accent = false) => (
    <section className={`${panel} flex min-w-56 flex-1 flex-col gap-1.5 p-6 ${accent ? "border-t-[3px] border-t-accent" : ""}`}>
      <span className="text-sm text-[#45474B]">{label}</span>
      <span className="font-display text-[30px] leading-tight font-bold">{value}</span>
      <span className="text-[13px] text-muted">{note}</span>
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Earnings</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#45474B]">
          What Square Market has earned in commission, and the money you are holding for vendors. Customers pay you first; a vendor is paid only after an
          order is delivered and its protection period is over.
        </p>
      </div>
      <ErrorText message={error} />

      {!data ? (
        !error && <p className="text-muted">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {card("Commission this month", naira.format(data.commission.thisMonth), `Sales this month ${naira.format(data.sales.thisMonth)}`, true)}
            {card("Commission, all time", naira.format(data.commission.allTime), `${data.sales.deliveredOrders} delivered vendor orders, ${naira.format(data.sales.allTime)} in sales`)}
          </div>

          <div className="flex flex-wrap gap-4">
            {card("Held for vendors (protection period)", naira.format(data.owed.pending), "Delivered, but not payable yet. Customers can still report a problem.")}
            {card("Payable to vendors now", naira.format(data.owed.available), "Vendors can ask for this. Includes requests you have not paid yet.")}
            {card(
              "Payout requests waiting",
              naira.format(data.owed.payoutsRequested),
              data.owed.payoutsRequestedCount === 0 ? "Nothing waiting." : `${data.owed.payoutsRequestedCount} to pay`,
            )}
          </div>

          {data.openDisputes > 0 && (
            <p className="rounded-sm border border-[#B42318] bg-[#FEF3F2] p-4 text-sm text-[#B42318]">
              <strong>
                {data.openDisputes} customer {data.openDisputes === 1 ? "problem" : "problems"} to settle.
              </strong>{" "}
              The vendor&apos;s money for them is on hold.{" "}
              <Link href="/orders?filter=attention" className="font-semibold underline">
                Open orders that need attention
              </Link>
            </p>
          )}

          <section className={panel}>
            <h2 className="border-b border-line px-6 py-5 font-display text-[22px] font-semibold">By vendor</h2>
            {data.vendors.length === 0 ? (
              <p className="px-6 py-5 text-sm text-[#45474B]">No approved vendors yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F3F4F5] text-left">
                      <th className={th}>Vendor</th>
                      <th className={th}>Delivers</th>
                      <th className={th}>Orders</th>
                      <th className={th}>Sales</th>
                      <th className={th}>Your commission</th>
                      <th className={th}>Held</th>
                      <th className={th}>Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendors.map((v) => (
                      <tr key={v.id} className="border-t border-line">
                        <td className={`${td} font-semibold`}>
                          {v.name}
                          {v.commissionRate !== null && <span className="ml-2 text-[12px] font-normal text-muted">{v.commissionRate}% rate</span>}
                        </td>
                        <td className={`${td} text-[#45474B]`}>{v.deliveryMode === "self" ? "Themselves" : "Square Market"}</td>
                        <td className={`${td} text-[#45474B]`}>{v.orders}</td>
                        <td className={td}>{naira.format(v.sales)}</td>
                        <td className={`${td} font-display font-bold`}>{naira.format(v.commission)}</td>
                        <td className={td}>{naira.format(v.pending)}</td>
                        <td className={td}>{naira.format(v.available)}</td>
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
