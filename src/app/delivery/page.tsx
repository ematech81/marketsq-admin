"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText, PrimaryButton } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { NIGERIA_STATES } from "@/lib/states";

type Row = { fee: string; days: string };
type Rows = Record<string, Row>;

const blank = (): Rows => Object.fromEntries(NIGERIA_STATES.map((s) => [s, { fee: "", days: "3" }]));

export default function DeliveryPage() {
  return (
    <Shell>
      <Delivery />
    </Shell>
  );
}

function Delivery() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Rows | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fillFee, setFillFee] = useState("");

  useEffect(() => {
    api<{ zones: { state: string; fee: number; estimatedDays: number }[] }>("/delivery-zones")
      .then(({ zones }) => {
        const next = blank();
        for (const z of zones) next[z.state] = { fee: String(z.fee), days: String(z.estimatedDays) };
        setRows(next);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load delivery fees"));
  }, []);

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
      const zones = NIGERIA_STATES.filter((s) => rows[s].fee !== "").map((s) => ({
        state: s,
        fee: Number(rows[s].fee),
        estimatedDays: Number(rows[s].days) || 3,
      }));
      await api("/admin/delivery-zones", { method: "PUT", token, body: { zones } });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full border border-[#C6C6CB] bg-white px-2 py-2";

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Delivery fees</h1>
      <p className="mb-6 max-w-xl text-muted">
        Set what you charge to deliver to each state. A state with an empty fee is not delivered to, and customers
        there cannot check out.
      </p>
      <ErrorText message={error} />

      {rows === null ? (
        !error && <p className="text-muted">Loading…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Fill every empty state with (₦)</span>
              <input
                type="number"
                min={0}
                value={fillFee}
                onChange={(e) => setFillFee(e.target.value)}
                className="w-40 border border-[#C6C6CB] bg-white px-2 py-2"
              />
            </label>
            <button onClick={fillEmpty} className="border border-[#C6C6CB] px-4 py-2 hover:border-accent">
              Fill
            </button>
          </div>

          <div className="max-w-xl border border-line">
            <div className="grid grid-cols-[1fr_120px_90px] gap-3 border-b border-line bg-[#F3F4F5] p-3 text-sm font-medium">
              <span>State</span>
              <span>Fee (₦)</span>
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

          <div className="mt-6 flex items-center gap-4">
            <PrimaryButton onClick={save} busy={busy}>
              Save delivery fees
            </PrimaryButton>
            {saved && <span role="status" className="text-green-800">Saved</span>}
          </div>
        </>
      )}
    </>
  );
}
