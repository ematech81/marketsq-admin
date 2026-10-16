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
  // Who delivers it. 'vendor' means you do: courier details to ship, the customer's code to deliver.
  fulfilledBy: "platform" | "vendor";
  deliveryFee: number;
  delivery?: { courierName?: string; courierPhone?: string; note?: string };
  deliveredBy?: "code" | "customer" | "admin";
  codeTriesLeft: number;
  dispute?: { status: "open" | "released" | "refunded"; reason?: string };
  earning?: { net: number; commission: number; releaseAt?: string; releasedAt?: string };
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
const input = "box-border h-11 w-full rounded-sm border border-[#C6C6CB] bg-white px-3 text-[15px] outline-none focus:border-accent";

// A vendor's own orders. Confirm and pack them, then ship them.
// When Square Market delivers, the vendor's job ends at "shipped". When the vendor delivers, they say who is carrying
// the order, and finish it by entering the customer's 6-digit code, which proves the order arrived.
export default function VendorOrders() {
  const { token } = useAuth();
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState<Shipment[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Which order is showing the "who is delivering" form, and what has been typed.
  const [shipping, setShipping] = useState<string | null>(null);
  const [courier, setCourier] = useState({ courierName: "", courierPhone: "", note: "" });
  const [codes, setCodes] = useState<Record<string, string>>({});

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

  async function change(s: Shipment, status: string, extra: Record<string, string> = {}) {
    if (status === "cancelled" && !window.confirm("Cancel this order? The customer has already paid, so Square Market will refund them.")) return;
    setBusyId(s.id);
    setError("");
    try {
      await api(`/vendor/shipments/${s.id}/status`, { method: "PATCH", token, body: { status, ...extra } });
      setShipping(null);
      setCodes((c) => ({ ...c, [s.id]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order");
      await load();
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
          const mine = s.fulfilledBy === "vendor";
          const underReview = s.dispute?.status === "open";
          const code = codes[s.id] ?? "";
          return (
            <section key={s.id} className="rounded-sm border border-line bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                <div>
                  <span className="font-display text-lg font-semibold">Order {s.orderNumber}</span>
                  <span className="ml-3 text-[13px] text-muted">{day(s.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[13px] font-semibold">
                    {mine ? "You deliver this order" : "Square Market delivers"}
                  </span>
                  <span className={`rounded-sm px-2.5 py-1 text-[13px] font-semibold ${pill.cls}`}>{pill.text}</span>
                </div>
              </div>

              {underReview && (
                <p className="border-b border-[#B42318] bg-[#FEF3F2] px-6 py-3 text-sm text-[#B42318]">
                  <strong>The customer reported a problem.</strong> Your earnings for this order are on hold while Square Market looks into it.
                </p>
              )}

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
                  {mine && (
                    <li className="flex justify-between gap-4 py-2 text-[#45474B]">
                      <span>Delivery fee the customer paid (yours)</span>
                      <span className="font-semibold">{naira.format(s.deliveryFee)}</span>
                    </li>
                  )}
                </ul>

                <div className="min-w-52 flex-1 text-sm leading-relaxed">
                  <p className="mb-1 font-display text-base font-semibold">{mine ? "Deliver to" : "Send to"}</p>
                  <p className="font-semibold">{s.address.fullName}</p>
                  <p className="text-[#45474B]">
                    {s.address.street}, {s.address.city}, {s.address.state}
                    {s.address.landmark ? ` (near ${s.address.landmark})` : ""}
                  </p>
                  <a href={`tel:${s.address.phone}`} className="text-accent-ink hover:text-foreground">
                    {s.address.phone}
                  </a>
                  {s.delivery?.courierName && (
                    <p className="mt-3 text-[#45474B]">
                      <span className="font-semibold text-foreground">Delivered by:</span> {s.delivery.courierName}
                      {s.delivery.courierPhone ? `, ${s.delivery.courierPhone}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {s.status === "delivered" && s.earning && (
                <p className="border-t border-line bg-background px-6 py-4 text-sm text-[#45474B]">
                  You earned <strong className="text-foreground">{naira.format(s.earning.net)}</strong> (after {naira.format(s.earning.commission)} commission
                  {mine ? ", plus your delivery fee" : ""}).{" "}
                  {s.earning.releasedAt
                    ? "It is in your available balance."
                    : s.earning.releaseAt
                      ? `It becomes available for payout on ${day(s.earning.releaseAt)}${underReview ? ", once the problem is settled" : ""}.`
                      : ""}
                </p>
              )}

              {/* Placed, confirmed, packed: the next step */}
              {next && !underReview && (
                <div className="border-t border-line bg-background px-6 py-4">
                  {shipping === s.id ? (
                    <form
                      className="flex max-w-xl flex-col gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        change(s, "shipped", { courierName: courier.courierName, courierPhone: courier.courierPhone, note: courier.note });
                      }}
                    >
                      <p className="text-sm text-[#45474B]">
                        Who is delivering this order? The customer sees these details, and gets a 6-digit code that your rider collects from them when the
                        items arrive.
                      </p>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Rider, driver or courier company *
                        <input className={input} value={courier.courierName} onChange={(e) => setCourier({ ...courier, courierName: e.target.value })} required minLength={2} maxLength={80} placeholder="e.g. Musa Bello (rider)" />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Their phone number
                        <input className={input} value={courier.courierPhone} onChange={(e) => setCourier({ ...courier, courierPhone: e.target.value })} maxLength={20} inputMode="tel" placeholder="08012345678" />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Tracking number or note (optional)
                        <input className={input} value={courier.note} onChange={(e) => setCourier({ ...courier, note: e.target.value })} maxLength={300} />
                      </label>
                      <div className="flex gap-3">
                        <button type="submit" disabled={busyId === s.id} className="min-h-11 cursor-pointer rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60">
                          {busyId === s.id ? "Saving…" : "Mark as shipped"}
                        </button>
                        <button type="button" onClick={() => setShipping(null)} className="min-h-11 cursor-pointer px-3 text-sm font-semibold text-[#45474B]">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => (next.status === "shipped" && mine ? setShipping(s.id) : change(s, next.status))}
                        className="min-h-11 cursor-pointer rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60"
                      >
                        {busyId === s.id ? "Saving…" : next.label}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => change(s, "cancelled")}
                        className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-semibold text-[#B42318] disabled:opacity-60"
                      >
                        Cancel order
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Shipped */}
              {s.status === "shipped" && (
                <div className="border-t border-line bg-background px-6 py-4">
                  {!mine ? (
                    <span className="text-sm text-[#45474B]">On its way. Square Market marks it delivered, and your earnings then reach your wallet.</span>
                  ) : underReview ? (
                    <span className="text-sm text-[#45474B]">This order is under review, so it cannot be marked delivered yet.</span>
                  ) : s.codeTriesLeft === 0 ? (
                    <span className="text-sm text-[#B42318]">
                      Too many wrong codes. Ask the customer to tap &ldquo;I received my order&rdquo; on their order page, or contact Square Market.
                    </span>
                  ) : (
                    <form
                      className="flex max-w-xl flex-col gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        change(s, "delivered", { code });
                      }}
                    >
                      <p className="text-sm text-[#45474B]">
                        When the customer has received the items, ask them for the <strong>6-digit delivery code</strong> (it is on their order page and in their
                        SMS) and enter it here. Never mark it delivered without it. You have {s.codeTriesLeft} {s.codeTriesLeft === 1 ? "try" : "tries"} left.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <input
                          className={`${input} w-40 font-mono tracking-[0.3em]`}
                          value={code}
                          onChange={(e) => setCodes((c) => ({ ...c, [s.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                          inputMode="numeric"
                          pattern="\d{6}"
                          maxLength={6}
                          placeholder="000000"
                          aria-label="Delivery code"
                          required
                        />
                        <button type="submit" disabled={busyId === s.id || code.length !== 6} className="min-h-11 cursor-pointer rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60">
                          {busyId === s.id ? "Checking…" : "Mark as delivered"}
                        </button>
                      </div>
                    </form>
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
