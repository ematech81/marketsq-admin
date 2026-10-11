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
  deliveryFee: number;
  estimatedDelivery?: string;
  items: { title: string; quantity: number; price: number; options: { name: string; value: string }[] }[];
};

type Order = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
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

const PILL: Record<string, string> = {
  Delivered: "bg-[#DCFCE7] text-[#14532D]",
  Cancelled: "bg-surface text-muted",
  "Awaiting payment": "bg-surface text-foreground",
  "Needs attention": "bg-[#FEF3F2] text-[#B42318]",
  New: "bg-accent text-foreground",
};

const NEXT: Record<string, { status: string; label: string } | undefined> = {
  placed: { status: "confirmed", label: "Confirm order" },
  confirmed: { status: "packed", label: "Mark as packed" },
  packed: { status: "shipped", label: "Mark as shipped" },
  shipped: { status: "delivered", label: "Mark as delivered" },
};

const STATUS_TEXT: Record<string, string> = {
  placed: "New, waiting to be confirmed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "On its way to the customer",
  delivered: "Delivered",
  cancelled: "Cancelled",
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
    if (
      status === "cancelled" &&
      !window.confirm(
        "Cancel this shipment? The items go back on sale. You need to refund the customer yourself from your KoraPay dashboard.",
      )
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

  const unpaid = order.paymentStatus !== "paid";

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/orders" className="hover:text-foreground">
          Orders
        </Link>{" "}
        / <span className="text-foreground">{order.orderNumber}</span>
      </nav>

      <section className={`${panel} flex flex-col gap-2 p-6`}>
        <span className={`self-start rounded-sm px-2.5 py-1 text-[13px] font-semibold ${PILL[order.status] ?? "bg-[#FBEAE4] text-[#8A3219]"}`}>
          {order.status}
        </span>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Order {order.orderNumber}</h1>
        <span className="text-[15px] text-[#45474B]">
          Placed on {new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
        </span>
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

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          {order.shipments.map((s) => {
            const next = NEXT[s.status];
            return (
              <section key={s._id} className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
                  <div>
                    <span className="text-[13px] text-muted">Sold by {s.vendorName}</span>
                    <h2 className="font-display text-[20px] font-semibold">{STATUS_TEXT[s.status]}</h2>
                  </div>
                  {s.estimatedDelivery && s.status !== "delivered" && s.status !== "cancelled" && (
                    <span className="text-sm text-[#45474B]">
                      Promised by{" "}
                      {new Date(s.estimatedDelivery).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-line">
                  {s.items.map((i, n) => (
                    <li key={n} className="flex justify-between gap-4 px-6 py-3.5 text-[15px]">
                      <span>
                        {i.quantity} × {i.title}
                        {i.options.length > 0 && <span className="text-muted"> ({i.options.map((o) => `${o.name}: ${o.value}`).join(", ")})</span>}
                      </span>
                      <span className="font-semibold">{naira.format(i.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                {(next || (s.status !== "delivered" && s.status !== "cancelled")) && !unpaid && (
                  <div className="flex flex-wrap gap-3 border-t border-line bg-background px-6 py-4">
                    {next && (
                      <button
                        type="button"
                        disabled={busyId === s._id}
                        onClick={() => change(s, next.status)}
                        className="min-h-11 cursor-pointer rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60"
                      >
                        {busyId === s._id ? "Saving…" : next.label}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === s._id}
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

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
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

          <section className={`${panel} flex flex-col gap-1.5 p-6`}>
            <h2 className={`${h2} mb-1`}>Deliver to</h2>
            <span className="text-[15px] font-semibold">{order.address.fullName}</span>
            <span className="text-[15px] leading-normal text-[#45474B]">
              {order.address.street}
              <br />
              {order.address.city}, {order.address.state}
              {order.address.landmark && (
                <>
                  <br />
                  Near {order.address.landmark}
                </>
              )}
            </span>
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
              <span>Total</span>
              <span className="font-display">{naira.format(order.total)}</span>
            </p>
            <span className={`text-[13px] font-semibold ${order.paymentStatus === "paid" ? "text-[#166534]" : "text-[#B42318]"}`}>
              {order.paymentStatus === "paid" ? "Paid with KoraPay" : order.paymentStatus === "pending" ? "Not paid yet" : "Payment needs checking"}
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}
