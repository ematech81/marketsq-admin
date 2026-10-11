"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import VendorTable, { type VendorRow } from "@/components/VendorTable";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TABS = [
  { value: "pending", label: "Waiting for review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export default function VendorsPage() {
  return (
    <Shell adminOnly>
      <Vendors />
    </Shell>
  );
}

function Vendors() {
  const { token } = useAuth();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<VendorRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<{ vendors: VendorRow[] }>(`/admin/vendors?status=${status}`, { token });
      setRows(res.vendors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load vendors");
    }
  }, [token, status]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[32px] font-bold tracking-[-0.02em]">Vendors</h1>

      <div role="group" aria-label="Vendor status" className="inline-flex flex-wrap self-start rounded-sm border border-[#C6C6CB] bg-white">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setRows(null);
              setStatus(t.value);
            }}
            className={`min-h-11 cursor-pointer px-4 text-sm ${
              status === t.value ? "bg-foreground font-semibold text-white" : "bg-transparent font-medium"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ErrorText message={error} />

      <section className="rounded-sm border border-line bg-white">
        {rows === null ? (
          !error && <p className="px-6 py-5 text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-5 text-sm text-[#45474B]">No vendors here.</p>
        ) : (
          <VendorTable rows={rows} onChanged={load} />
        )}
      </section>
    </div>
  );
}
