"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  joinedAt: string;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

const th = "px-4 py-3 font-semibold first:pl-6 last:pr-6";
const td = "px-4 py-3.5 first:pl-6 last:pr-6";

export default function CustomersPage() {
  return (
    <Shell adminOnly>
      <Customers />
    </Shell>
  );
}

function Customers() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ customers: Customer[] }>("/admin/customers", { token })
      .then((r) => setRows(r.customers))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load customers"));
  }, [token]);

  const shown = rows?.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-[-0.02em]">Customers</h1>
          {rows && <p className="text-sm text-[#45474B]">{rows.length} accounts</p>}
        </div>
        <input
          type="search"
          aria-label="Search customers"
          placeholder="Search name, email or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 w-full max-w-xs rounded-sm border border-[#C6C6CB] bg-white px-3.5 text-sm outline-none focus:border-accent"
        />
      </div>

      <ErrorText message={error} />

      <section className="rounded-sm border border-line bg-white">
        {shown === undefined ? (
          !error && <p className="px-6 py-5 text-sm text-muted">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="px-6 py-5 text-sm text-[#45474B]">{rows?.length ? "No one matches that search." : "No customers yet."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-sm">
              <thead>
                <tr className="bg-[#F3F4F5] text-left">
                  <th className={th}>Customer</th>
                  <th className={th}>Phone</th>
                  <th className={th}>Joined</th>
                  <th className={th}>Orders</th>
                  <th className={th}>Spent</th>
                  <th className={th}>Last order</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className={td}>
                      <span className="font-semibold">{c.name}</span>
                      {c.role === "vendor" && <span className="ml-2 rounded-sm bg-surface px-1.5 py-0.5 text-xs font-semibold">Vendor</span>}
                      <span className="block text-[13px] text-muted">{c.email}</span>
                    </td>
                    <td className={`${td} text-[#45474B]`}>{c.phone}</td>
                    <td className={`${td} text-[#45474B]`}>{day(c.joinedAt)}</td>
                    <td className={td}>{c.orders}</td>
                    <td className={`${td} font-display text-base font-bold`}>{naira.format(c.spent)}</td>
                    <td className={`${td} text-[#45474B]`}>{c.lastOrderAt ? day(c.lastOrderAt) : "-"}</td>
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
