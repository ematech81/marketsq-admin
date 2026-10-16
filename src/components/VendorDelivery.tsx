"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { NIGERIA_STATES } from "@/lib/states";
import { ErrorText, PrimaryButton } from "./form";

type Row = { fee: string; days: string };
type Rows = Record<string, Row>;

const blank = (): Rows => Object.fromEntries(NIGERIA_STATES.map((s) => [s, { fee: "", days: "3" }]));
const input = "w-full border border-[#C6C6CB] bg-white px-2 py-2";
const panel = "rounded-sm border border-line bg-white";

// The vendor's delivery choice: Square Market delivers (the default), or the vendor delivers their own orders and sets
// a fee for each state they serve.
export default function VendorDelivery() {
  const { token } = useAuth();
  const [mode, setMode] = useState<"platform" | "self">("platform");
  const [locked, setLocked] = useState(false);
  const [rows, setRows] = useState<Rows | null>(null);
  const [fillFee, setFillFee] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ mode: "platform" | "self"; locked: boolean; rates: { state: string; fee: number; estimatedDays: number }[] }>("/vendor/delivery", { token })
      .then((r) => {
        const next = blank();
        for (const x of r.rates) next[x.state] = { fee: String(x.fee), days: String(x.estimatedDays) };
        setRows(next);
        setMode(r.mode);
        setLocked(r.locked);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your delivery settings"));
  }, [token]);

  const update = (state: string, patch: Partial<Row>) => {
    setSaved(false);
    setRows((r) => (r ? { ...r, [state]: { ...r[state], ...patch } } : r));
  };

  function fillEmpty() {
    if (fillFee === "") return;
    setSaved(false);
    setRows((r) => {
      if (!r) return r;
      const next = { ...r };
      for (const s of NIGERIA_STATES) if (next[s].fee === "") next[s] = { ...next[s], fee: fillFee };
      return next;
    });
  }

  async function save() {
    if (!rows) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const rates = NIGERIA_STATES.filter((s) => rows[s].fee !== "").map((s) => ({ state: s, fee: Number(rows[s].fee), estimatedDays: Number(rows[s].days) || 3 }));
      await api("/vendor/delivery", { method: "PUT", token, body: { mode, rates } });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const choice = (value: "platform" | "self", title: string, body: string, disabled = false) => (
    <label
      className={`flex items-start gap-3 rounded-sm border p-4 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${mode === value ? "border-foreground bg-[#F8F9FA]" : "border-[#C6C6CB]"}`}
    >
      <input
        type="radio"
        name="mode"
        checked={mode === value}
        disabled={disabled}
        onChange={() => {
          setMode(value);
          setSaved(false);
        }}
        className="mt-1 size-[18px] accent-accent"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-sm text-[#45474B]">{body}</span>
      </span>
    </label>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Delivery</h1>
        <p className="mt-1 text-sm text-[#45474B]">Choose who delivers your orders. This applies to new orders from now on.</p>
      </div>
      <ErrorText message={error} />

      {rows === null ? (
        !error && <p className="text-muted">Loading…</p>
      ) : (
        <>
          <section className={`${panel} flex flex-col gap-3 p-6`}>
            {choice(
              "platform",
              "Square Market delivers my orders",
              "You confirm and pack. Square Market collects the items and delivers them at the store's delivery fees, and keeps the delivery fee. Customers can also pay on delivery.",
            )}
            {choice(
              "self",
              "I deliver my orders myself",
              "You set your own delivery fee for each state you serve, keep that fee, and deliver with your own rider or a courier. Orders are paid online only.",
              locked,
            )}
            {locked && (
              <p className="rounded-sm border border-line bg-[#F8F9FA] p-3 text-[13px] text-[#45474B]">
                Square Market delivers your orders at the moment. Contact Square Market if you want to deliver them yourself.
              </p>
            )}
          </section>

          {mode === "self" && (
            <>
              <section className={`${panel} flex flex-col gap-2 p-6 text-sm text-[#45474B]`}>
                <h2 className="font-display text-lg font-semibold text-foreground">How delivering yourself works</h2>
                <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5">
                  <li>Customers see your fee for their state. A state you leave empty is a state you do not deliver to.</li>
                  <li>
                    When you ship an order, you say who is carrying it. The customer is shown that, and gets a <strong>6-digit delivery code</strong>.
                  </li>
                  <li>When the items arrive, your rider asks the customer for the code. You enter it to mark the order delivered.</li>
                  <li>
                    Your earnings (items minus commission, plus your delivery fee) then wait a few days in your wallet, so a customer can report a problem
                    first. After that you can ask for a payout.
                  </li>
                </ol>
              </section>

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Fill every empty state with (₦)</span>
                  <input type="number" min={0} value={fillFee} onChange={(e) => setFillFee(e.target.value)} className="w-40 border border-[#C6C6CB] bg-white px-2 py-2" />
                </label>
                <button type="button" onClick={fillEmpty} className="cursor-pointer border border-[#C6C6CB] bg-white px-4 py-2 hover:border-accent">
                  Fill
                </button>
              </div>

              <div className="border border-line bg-white">
                <div className="grid grid-cols-[1fr_120px_90px] gap-3 border-b border-line bg-[#F3F4F5] p-3 text-sm font-medium">
                  <span>State</span>
                  <span>Your fee (₦)</span>
                  <span>Days</span>
                </div>
                {NIGERIA_STATES.map((s) => (
                  <div key={s} className="grid grid-cols-[1fr_120px_90px] items-center gap-3 border-b border-line p-3 last:border-0">
                    <span>{s}</span>
                    <input
                      aria-label={`${s} delivery fee`}
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Not delivered"
                      value={rows[s].fee}
                      onChange={(e) => update(s, { fee: e.target.value })}
                      className={input}
                    />
                    <input
                      aria-label={`${s} delivery days`}
                      type="number"
                      min={1}
                      max={30}
                      value={rows[s].days}
                      onChange={(e) => update(s, { days: e.target.value })}
                      className={input}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-4">
            <PrimaryButton onClick={save} busy={busy}>
              Save
            </PrimaryButton>
            {saved && (
              <span role="status" className="text-green-800">
                Saved
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
