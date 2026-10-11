"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorText } from "./form";

type Shipment = {
  id: string;
  orderNumber: string;
  status: "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  estimatedDelivery?: string;
  itemsTotal: number;
  items: { title: string; quantity: number; price: number; options: { name: string; value: string }[] }[];
  address: { fullName: string; phone: string; street: string; city: string; state: string; landmark?: string };
};

const TABS = [
  { value: "open", label: "To do" },
  { value: "done", label: "Finished" },
  { value: "all", label: "All" },
];

const NEXT: Record<string, { status: string; label: string } | undefined> = {
  placed: { status: "confirmed", label: "Confirm order" },
  confirmed: { status: "packed", label: "Mark as packed" },
  packed: { status: "shipped", label: "Mark as shipped" },
};

const STATUS_TEXT: Record<string, { text: string; cls: string }> = {
  placed: { text: "New: please confirm", cls: "bg-accent text-foreground" },
  confirmed: { text: "Confirmed", cls: "bg-[#FBEAE4] text-[#8A3219]" },
  packed: { text: "Packed", cls: "bg-[#FBEAE4] text-[#8A3219]" },
  shipped: { text: "Shipped", cls: "bg-[#FBEAE4] text-[#8A3219]" },
  delivered: { text: "Delivered", cls: "bg-[#DCFCE7] text-[#14532D]" },
  cancelled: { text: "Cancelled", cls: "bg-surface text-muted" },
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

// A vendor's own orders: confirm, pack and ship. Marking an order delivered is done by Square Market.
export default function VendorOrders() {
  const { token } = useAuth();
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState<Shipment[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await api<{ shipments: Shipment[] }>(`/vendor/orders?filter=${filter}`, { token })).shipments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    }
  }, [token, filter]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function change(s: Shipment, status: string) {
    if (status === "cancelled" && !window.confirm("Cancel this order? The customer has already paid, so Square Market will refund them.")) return;
    setBusyId(s.id);
    setError("");
    try {
      await api(`/vendor/shipments/${s.id}/status`, { method: "PATCH", token, body: { status } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order");
    } finally {
      setBusyId(null);
    }
  }

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
            className={`min-h-11 cursor-pointer px-4 text-sm ${filter === t.value ? "bg-foreground font-semibold text-white" : "bg-transparent font-medium"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ErrorText message={error} />

      {rows === null ? (
        !error && <p className="text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-sm border border-line bg-white p-6 text-sm text-[#45474B]">{filter === "open" ? "Nothing to do right now." : "No orders here."}</p>
      ) : (
        rows.map((s) => {
          const next = NEXT[s.status];
          const pill = STATUS_TEXT[s.status];
          return (
            <section key={s.id} className="rounded-sm border border-line bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                <div>
                  <span className="font-display text-lg font-semibold">Order {s.orderNumber}</span>
                  <span className="ml-3 text-[13px] text-muted">{day(s.createdAt)}</span>
                </div>
                <span className={`rounded-sm px-2.5 py-1 text-[13px] font-semibold ${pill.cls}`}>{pill.text}</span>
              </div>

              <div className="flex flex-wrap gap-8 px-6 py-5">
                <ul className="min-w-60 flex-[2] divide-y divide-line text-[15px]">
                  {s.items.map((i, n) => (
                    <li key={n} className="flex justify-between gap-4 py-2">
                      <span>
                        {i.quantity} × {i.title}
                        {i.options.length > 0 && <span className="text-muted"> ({i.options.map((o) => `${o.name}: ${o.value}`).join(", ")})</span>}
                      </span>
                      <span className="font-semibold">{naira.format(i.price * i.quantity)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-4 py-2 font-bold">
                    <span>Items total</span>
                    <span className="font-display">{naira.format(s.itemsTotal)}</span>
                  </li>
                </ul>

                <div className="min-w-52 flex-1 text-sm leading-relaxed">
                  <p className="mb-1 font-display text-base font-semibold">Send to</p>
                  <p className="font-semibold">{s.address.fullName}</p>
                  <p className="text-[#45474B]">
                    {s.address.street}, {s.address.city}, {s.address.state}
                    {s.address.landmark ? ` (near ${s.address.landmark})` : ""}
                  </p>
                  <a href={`tel:${s.address.phone}`} className="text-accent-ink hover:text-foreground">
                    {s.address.phone}
                  </a>
                </div>
              </div>

              {(next || s.status === "shipped") && (
                <div className="flex flex-wrap items-center gap-3 border-t border-line bg-background px-6 py-4">
                  {next && (
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => change(s, next.status)}
                      className="min-h-11 cursor-pointer rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {busyId === s.id ? "Saving…" : next.label}
                    </button>
                  )}
                  {next && (
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => change(s, "cancelled")}
                      className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-semibold text-[#B42318] disabled:opacity-60"
                    >
                      Cancel order
                    </button>
                  )}
                  {s.status === "shipped" && (
                    <span className="text-sm text-[#45474B]">On its way. Square Market marks it delivered, and your payment then reaches your wallet.</span>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
