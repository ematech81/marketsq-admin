"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Shipment = {
  _id: string;
  vendorName: string;
  status: "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
  timeline: { status: string; at: string }[];
  deliveryFee: number;
  estimatedDelivery?: string;
  items: { title: string; image?: string; quantity: number; price: number; options: { name: string; value: string }[] }[];
};

type Order = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: "online" | "cod";
  paidAt?: string;
  createdAt: string;
  needsAttention?: string;
  user: { name: string; email: string; phone: string };
  contactEmail?: string;
  address: { fullName: string; phone: string; street: string; city: string; state: string; landmark?: string };
  subtotal: number;
  deliveryTotal: number;
  total: number;
  shipments: Shipment[];
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

const PILL: Record<string, string> = {
  Delivered: "bg-[#DCFCE7] text-[#14532D]",
  Cancelled: "bg-surface text-muted",
  "Awaiting payment": "bg-surface text-foreground",
  "Needs attention": "bg-[#FEF3F2] text-[#B42318]",
  New: "bg-accent text-foreground",
};

// The same five steps the customer sees on their tracking page. Ticking one here shows it there at once.
const STEPS = ["placed", "confirmed", "packed", "shipped", "delivered"] as const;
const STEP_LABEL: Record<string, string> = {
  placed: "Order placed",
  confirmed: "Order confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
};
const STEP_HINT: Record<string, string> = {
  confirmed: "Tick when you have confirmed the order",
  packed: "Tick when the items are packed",
  shipped: "Tick when it leaves for the customer",
  delivered: "Tick when the customer has received it",
};

const panel = "rounded-sm border border-line bg-white";
const h2 = "font-display text-lg font-semibold";

export default function OrderPage() {
  return (
    <Shell adminOnly>
      <Detail />
    </Shell>
  );
}

function Detail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder((await api<{ order: Order }>(`/admin/orders/${orderNumber}`, { token })).order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this order");
    }
  }, [token, orderNumber]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function change(s: Shipment, status: string) {
    const cod = order?.paymentMethod === "cod";
    if (
      status === "delivered" &&
      cod &&
      order?.paymentStatus === "cod" &&
      !window.confirm("Pay on delivery: have you collected the money from the customer? Marking this delivered also credits the vendor.")
    ) {
      return;
    }
    if (
      status === "cancelled" &&
      !window.confirm("Cancel this shipment? The items go back on sale. If the customer paid online, refund them from your KoraPay dashboard.")
    ) {
      return;
    }
    setBusyId(s._id);
    setError("");
    try {
      await api(`/admin/shipments/${s._id}/status`, { method: "PATCH", token, body: { status } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the shipment");
    } finally {
      setBusyId(null);
    }
  }

  if (!order) return error ? <ErrorText message={error} /> : <p className="text-muted">Loading…</p>;

  const cod = order.paymentMethod === "cod";
  // A pay-on-delivery order is worked on straight away; the money is collected when it is delivered.
  const unpaid = order.paymentStatus !== "paid" && order.paymentStatus !== "cod";

  // Where the money stands, as ticks, the same way the customer reads it.
  const paymentSteps: { label: string; done: boolean; note: string }[] = [
    { label: "Order placed", done: true, note: longDate(order.createdAt) },
    cod
      ? { label: "Pay on delivery", done: true, note: `Customer pays ${naira.format(order.total)} when it arrives` }
      : {
          label: "Payment confirmed",
          done: order.paymentStatus === "paid",
          note:
            order.paymentStatus === "paid" && order.paidAt
              ? `${longDate(order.paidAt)} · KoraPay`
              : order.paymentStatus === "pending"
                ? "Waiting for the customer to pay"
                : order.paymentStatus === "failed"
                  ? "Payment not completed"
                  : "Needs checking",
        },
    ...(cod
      ? [
          {
            label: "Payment collected",
            done: order.paymentStatus === "paid",
            note: order.paymentStatus === "paid" && order.paidAt ? longDate(order.paidAt) : "Marked when the last shipment is delivered",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/orders" className="hover:text-foreground">
          Orders
        </Link>{" "}
        / <span className="text-foreground">{order.orderNumber}</span>
      </nav>

      <section className={`${panel} flex flex-col gap-4 p-6`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-sm px-2.5 py-1 text-[13px] font-semibold ${PILL[order.status] ?? "bg-[#FBEAE4] text-[#8A3219]"}`}>
            {order.status}
          </span>
          {cod && <span className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[13px] font-semibold">Pay on delivery</span>}
        </div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Order {order.orderNumber}</h1>
        <span className="text-[15px] text-[#45474B]">
          Placed on {longDate(order.createdAt)}
          {order.shipments.length > 0 && ` · ${order.shipments.length} ${order.shipments.length === 1 ? "shipment" : "shipments"}`}
        </span>
        <ol className="m-0 flex list-none flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4">
          {paymentSteps.map((st) => (
            <li key={st.label} className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 text-[13px] font-bold ${st.done ? "border-foreground bg-foreground text-white" : "border-[#C6C6CB] bg-white"}`}
              >
                {st.done ? "✓" : ""}
              </span>
              <span className="flex flex-col">
                <span className={`text-[15px] ${st.done ? "font-semibold" : "font-medium text-muted"}`}>{st.label}</span>
                <span className="text-[13px] text-muted">{st.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <ErrorText message={error} />
      {order.needsAttention && (
        <p className="rounded-sm border border-[#B42318] bg-[#FEF3F2] p-4 text-sm text-[#B42318]">
          <strong>Needs attention:</strong> {order.needsAttention}
        </p>
      )}
      {order.paymentStatus === "pending" && (
        <p className={`${panel} p-4 text-sm`}>This order has not been paid yet, so there is nothing to deliver.</p>
      )}
      {order.paymentStatus === "cod" && (
        <p className="rounded-sm border border-accent bg-[#FBEAE4] p-4 text-sm text-[#8A3219]">
          <strong>Pay on delivery.</strong> Collect {naira.format(order.total)} from the customer when it is delivered. This order becomes paid when
          every shipment is delivered.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          {order.shipments.map((s, n) => {
            const current = STEPS.indexOf(s.status as (typeof STEPS)[number]);
            const at = (status: string) => s.timeline.find((t) => t.status === status)?.at;
            const busy = busyId === s._id;
            return (
              <section key={s._id} className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted">
                      Shipment {n + 1} of {order.shipments.length} · Sold by
                    </span>
                    <h2 className="font-display text-[22px] font-semibold">{s.vendorName}</h2>
                  </div>
                  {s.estimatedDelivery && s.status !== "delivered" && s.status !== "cancelled" && (
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[13px] text-muted">Promised delivery</span>
                      <strong className="text-[15px]">
                        {new Date(s.estimatedDelivery).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}
                      </strong>
                    </div>
                  )}
                </div>

                {s.status === "cancelled" ? (
                  <p className="p-6 text-[15px] font-semibold text-[#B42318]">This shipment was cancelled.</p>
                ) : (
                  <ol className="m-0 flex list-none flex-col p-6">
                    {STEPS.map((name, i) => {
                      const done = i <= Math.max(current, 0);
                      const next = !unpaid && i === current + 1;
                      const last = i === STEPS.length - 1;
                      const when = at(name);
                      return (
                        <li key={name} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            {next ? (
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={false}
                                aria-label={`${STEP_LABEL[name]}: ${STEP_HINT[name]}`}
                                disabled={busy}
                                onClick={() => change(s, name)}
                                className="flex size-7 shrink-0 cursor-pointer items-center justify-center border-2 border-accent bg-white text-sm font-bold text-foreground hover:bg-accent disabled:opacity-60"
                              />
                            ) : (
                              <span
                                className={`flex size-7 shrink-0 items-center justify-center border-2 text-sm font-bold text-white ${
                                  done ? "border-foreground bg-foreground" : "border-[#C6C6CB] bg-white"
                                }`}
                              >
                                {done ? "✓" : ""}
                              </span>
                            )}
                            <span className={`min-h-6 w-0.5 grow ${last ? "bg-transparent" : done && i < current ? "bg-foreground" : "bg-line"}`} />
                          </div>
                          <div className="flex flex-col gap-0.5 pb-5">
                            <span className={`text-base ${done || next ? "font-semibold" : "font-medium text-muted"}`}>{STEP_LABEL[name]}</span>
                            <span className="text-[13px] text-muted">
                              {done ? (when ? shortDate(when) : "") : next ? (busy ? "Saving…" : STEP_HINT[name]) : "Waiting for the step above"}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <ul className="divide-y divide-line border-t border-line">
                  {s.items.map((i, k) => (
                    <li key={k} className="flex items-center gap-4 px-6 py-3.5 text-[15px]">
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-sm border border-line bg-surface">
                        {i.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.image} alt={i.title} className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-semibold">{i.title}</span>
                        {i.options.length > 0 && <span className="text-[13px] text-muted">{i.options.map((o) => `${o.name}: ${o.value}`).join(", ")}</span>}
                        <span className="text-[13px] text-muted">Qty {i.quantity}</span>
                      </span>
                      <span className="shrink-0 font-semibold">{naira.format(i.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>

                {s.status !== "delivered" && s.status !== "cancelled" && !unpaid && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-background px-6 py-4">
                    <span className="text-[13px] text-muted">Each tick shows on the customer&apos;s tracking page straight away.</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => change(s, "cancelled")}
                      className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-semibold text-[#B42318] disabled:opacity-60"
                    >
                      Cancel shipment
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          <section className={`${panel} flex flex-col gap-1.5 p-6`}>
            <h2 className={`${h2} mb-1`}>Customer</h2>
            <span className="text-[15px] font-semibold">{order.user.name}</span>
            <a href={`tel:${order.address.phone}`} className="text-[15px] text-accent-ink hover:text-foreground">
              {order.address.phone}
            </a>
            <a href={`mailto:${order.contactEmail ?? order.user.email}`} className="text-[15px] break-all text-accent-ink hover:text-foreground">
              {order.contactEmail ?? order.user.email}
            </a>
          </section>

          <section className={`${panel} flex flex-col gap-2 p-6`}>
            <h2 className={`${h2} mb-1`}>Delivery address</h2>
            <span className="text-[15px] font-semibold">{order.address.fullName}</span>
            <span className="text-[15px] leading-normal text-[#45474B]">
              {order.address.street}, {order.address.city}
              <br />
              {order.address.state}
              {order.address.landmark && (
                <>
                  <br />
                  Near {order.address.landmark}
                </>
              )}
            </span>
            <span className="text-[15px] text-[#45474B]">{order.address.phone}</span>
          </section>

          <section className={`${panel} flex flex-col gap-2.5 p-6`}>
            <h2 className={`${h2} mb-1`}>Payment</h2>
            <p className="flex justify-between text-[15px]">
              <span className="text-[#45474B]">Items</span>
              <span>{naira.format(order.subtotal)}</span>
            </p>
            <p className="flex justify-between text-[15px]">
              <span className="text-[#45474B]">Delivery</span>
              <span>{naira.format(order.deliveryTotal)}</span>
            </p>
            <p className="flex justify-between border-t border-line pt-3 text-[17px] font-bold">
              <span>{order.paymentStatus === "paid" ? "Total paid" : order.paymentStatus === "cod" ? "To collect on delivery" : "Total"}</span>
              <span className="font-display">{naira.format(order.total)}</span>
            </p>
            <span className={`text-[13px] font-semibold ${order.paymentStatus === "paid" ? "text-[#166534]" : order.paymentStatus === "cod" ? "text-[#8A3219]" : "text-[#B42318]"}`}>
              {order.paymentStatus === "paid"
                ? cod
                  ? "Paid on delivery"
                  : "Paid with KoraPay"
                : order.paymentStatus === "cod"
                  ? `Pay on delivery: collect ${naira.format(order.total)}`
                  : order.paymentStatus === "pending"
                    ? "Not paid yet"
                    : "Payment needs checking"}
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}
