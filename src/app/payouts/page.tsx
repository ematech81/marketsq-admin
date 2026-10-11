"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Payout = {
  _id: string;
  amount: number;
  status: "requested" | "paid" | "rejected";
  createdAt: string;
  paidAt?: string;
  reference?: string;
  rejectionReason?: string;
  bank: { bankName: string; accountNumber: string; accountName: string };
  vendor?: { businessName: string; phone: string };
};

const TABS = [
  { value: "requested", label: "Waiting to be paid" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Turned down" },
];

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
const th = "px-4 py-3 font-semibold first:pl-6 last:pr-6";
const td = "px-4 py-3.5 first:pl-6 last:pr-6";

export default function PayoutsPage() {
  return (
    <Shell adminOnly>
      <Payouts />
    </Shell>
  );
}

function Payouts() {
  const { token } = useAuth();
  const [status, setStatus] = useState("requested");
  const [rows, setRows] = useState<Payout[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await api<{ payouts: Payout[] }>(`/admin/payouts?status=${status}`, { token })).payouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payouts");
    }
  }, [token, status]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function decide(p: Payout, decision: "paid" | "rejected") {
    let reference: string | undefined;
    let reason: string | undefined;
    if (decision === "paid") {
      if (!window.confirm(`Mark ${naira.format(p.amount)} to ${p.vendor?.businessName} as paid? Only do this after you have sent the money.`)) return;
      reference = window.prompt("Bank reference for this transfer (optional)") || undefined;
    } else {
      const answer = window.prompt(`Why is this payout not approved? The money goes back to ${p.vendor?.businessName}'s wallet and they will see this.`);
      if (!answer || !answer.trim()) return;
      reason = answer.trim();
    }
    setBusyId(p._id);
    setError("");
    try {
      await api(`/admin/payouts/${p._id}`, { method: "PATCH", token, body: { status: decision, reference, reason } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the decision");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Payouts</h1>
        <p className="mt-1 text-sm text-[#45474B]">Amounts are after Square Market commission. Send the money from your bank, then mark it as paid.</p>
      </div>

      <div role="group" aria-label="Payout status" className="inline-flex flex-wrap self-start rounded-sm border border-[#C6C6CB] bg-white">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setRows(null);
              setStatus(t.value);
            }}
            className={`min-h-11 cursor-pointer px-4 text-sm ${status === t.value ? "bg-foreground font-semibold text-white" : "bg-transparent font-medium"}`}
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
          <p className="px-6 py-5 text-sm text-[#45474B]">Nothing here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-sm">
              <thead>
                <tr className="bg-[#F3F4F5] text-left">
                  <th className={th}>Vendor</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Pay to</th>
                  <th className={th}>Requested</th>
                  <th className={`${th} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p._id} className="border-t border-line align-top">
                    <td className={`${td} font-semibold`}>
                      {p.vendor?.businessName}
                      <span className="block text-[13px] font-normal text-muted">{p.vendor?.phone}</span>
                    </td>
                    <td className={`${td} font-display text-base font-bold`}>{naira.format(p.amount)}</td>
                    <td className={`${td} text-[#45474B]`}>
                      {p.bank.bankName} {p.bank.accountNumber}
                      <span className="block text-[13px] text-muted">{p.bank.accountName}</span>
                    </td>
                    <td className={`${td} text-[#45474B]`}>
                      {day(p.createdAt)}
                      {p.status === "paid" && p.paidAt && <span className="block text-[13px] text-muted">Paid {day(p.paidAt)}{p.reference ? `, ref ${p.reference}` : ""}</span>}
                      {p.status === "rejected" && <span className="block text-[13px] text-[#B42318]">{p.rejectionReason}</span>}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      {p.status === "requested" && (
                        <>
                          <button type="button" disabled={busyId === p._id} onClick={() => decide(p, "paid")} className="mr-2 min-h-11 cursor-pointer rounded-sm bg-accent px-4 text-sm font-semibold text-foreground disabled:opacity-60">
                            Mark as paid
                          </button>
                          <button type="button" disabled={busyId === p._id} onClick={() => decide(p, "rejected")} className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-4 text-sm font-semibold text-[#B42318] disabled:opacity-60">
                            Reject
                          </button>
                        </>
                      )}
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
