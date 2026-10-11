"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText, Field, PrimaryButton } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Wallet = {
  balance: number;
  minPayoutAmount: number;
  commissionRate: number;
  bank: { bankName: string; accountNumber: string; accountName: string };
  transactions: { _id: string; type: string; amount: number; createdAt: string; note?: string }[];
  payouts: { _id: string; amount: number; status: "requested" | "paid" | "rejected"; createdAt: string; reference?: string; rejectionReason?: string }[];
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

const TYPE_LABEL: Record<string, string> = {
  sale: "Sale",
  commission: "Square Market commission",
  payout: "Payout requested",
  payout_reversal: "Payout returned to wallet",
  refund: "Taken back after a refund",
};

const PAYOUT_PILL: Record<string, string> = {
  requested: "bg-[#FBEAE4] text-[#8A3219]",
  paid: "bg-[#DCFCE7] text-[#14532D]",
  rejected: "bg-[#FEF3F2] text-[#B42318]",
};

const panel = "rounded-sm border border-line bg-white";

export default function WalletPage() {
  return (
    <Shell>
      <WalletView />
    </Shell>
  );
}

function WalletView() {
  const { token, user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const load = useCallback(async () => {
    try {
      setWallet(await api<Wallet>("/vendor/wallet", { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your wallet");
    }
  }, [token]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (user?.role !== "vendor") return <p className={`${panel} p-6`}>Wallets are for vendors.</p>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const amount = Number(new FormData(form).get("amount"));
    setBusy(true);
    setError("");
    setDone("");
    try {
      await api("/vendor/payouts", { method: "POST", token, body: { amount } });
      form.reset();
      setDone("Payout requested. We will pay you and mark it as paid.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request the payout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[32px] font-bold tracking-[-0.02em]">Wallet</h1>
      <ErrorText message={error} />
      {!wallet ? (
        !error && <p className="text-muted">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <section className={`${panel} flex min-w-60 flex-1 flex-col gap-2 border-t-[3px] border-t-accent p-6`}>
              <span className="text-sm text-[#45474B]">Available to withdraw</span>
              <span className="font-display text-4xl font-bold">{naira.format(wallet.balance)}</span>
              <span className="text-[13px] text-muted">
                You earn when an order is delivered: the items total minus Square Market&apos;s {wallet.commissionRate}% commission.
              </span>
            </section>

            <section className={`${panel} min-w-72 flex-1 p-6`}>
              <h2 className="mb-3 font-display text-lg font-semibold">Request a payout</h2>
              <form onSubmit={onSubmit} className="flex flex-col gap-3">
                <Field label="Amount (₦)" name="amount" type="number" min={wallet.minPayoutAmount} step={1} required hint={`The smallest payout is ${naira.format(wallet.minPayoutAmount)}.`} />
                <p className="text-[13px] text-muted">
                  Paid to {wallet.bank.bankName} {wallet.bank.accountNumber} ({wallet.bank.accountName}).
                </p>
                <PrimaryButton type="submit" busy={busy}>
                  Request payout
                </PrimaryButton>
                {done && <p role="status" className="text-sm text-[#166534]">{done}</p>}
              </form>
            </section>
          </div>

          <section className={panel}>
            <h2 className="border-b border-line px-6 py-5 font-display text-[22px] font-semibold">Payouts</h2>
            {wallet.payouts.length === 0 ? (
              <p className="px-6 py-5 text-sm text-[#45474B]">No payout requests yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {wallet.payouts.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
                    <span>
                      <span className="font-display text-base font-bold">{naira.format(p.amount)}</span>
                      <span className="block text-[13px] text-muted">
                        {day(p.createdAt)}
                        {p.reference ? ` · Ref ${p.reference}` : ""}
                        {p.rejectionReason ? ` · ${p.rejectionReason}` : ""}
                      </span>
                    </span>
                    <span className={`rounded-sm px-2.5 py-1 text-[13px] font-semibold capitalize ${PAYOUT_PILL[p.status]}`}>
                      {p.status === "requested" ? "Waiting" : p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={panel}>
            <h2 className="border-b border-line px-6 py-5 font-display text-[22px] font-semibold">Wallet history</h2>
            {wallet.transactions.length === 0 ? (
              <p className="px-6 py-5 text-sm text-[#45474B]">Nothing yet. Your sales appear here once an order is delivered.</p>
            ) : (
              <ul className="divide-y divide-line">
                {wallet.transactions.map((t) => (
                  <li key={t._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-sm">
                    <span>
                      {TYPE_LABEL[t.type] ?? t.type}
                      <span className="block text-[13px] text-muted">{day(t.createdAt)}</span>
                    </span>
                    <span className={`font-display text-base font-bold ${t.amount < 0 ? "text-[#B42318]" : "text-[#166534]"}`}>
                      {t.amount < 0 ? "-" : "+"}
                      {naira.format(Math.abs(t.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
