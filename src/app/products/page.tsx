"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Row = {
  _id: string;
  title: string;
  price: number;
  stock: number;
  status: "draft" | "pending" | "active" | "rejected";
  rejectionReason?: string;
  images: { url: string }[];
  category?: { name: string };
  vendor?: { businessName: string } | null;
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const STATUS: Record<Row["status"], { label: string; cls: string }> = {
  active: { label: "Live", cls: "bg-[#DCFCE7] text-[#14532D]" },
  draft: { label: "Draft", cls: "bg-surface text-foreground" },
  pending: { label: "In review", cls: "bg-[#FBEAE4] text-[#8A3219]" },
  rejected: { label: "Needs changes", cls: "bg-[#FEF3F2] text-[#B42318]" },
};

export default function ProductsPage() {
  return (
    <Shell>
      <ProductList />
    </Shell>
  );
}

function ProductList() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const base = isAdmin ? "/admin" : "/vendor";
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const qs = filter ? `?status=${filter}` : "";
      const res = await api<{ products: Row[] }>(`${base}/products${qs}`, { token });
      // Vendors' list has no server-side filter, so narrow it here.
      setRows(isAdmin || !filter ? res.products : res.products.filter((p) => p.status === filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products");
    }
  }, [token, filter, base, isAdmin]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function remove(row: Row) {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    try {
      await api(`${base}/products/${row._id}`, { method: "DELETE", token });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the product");
    }
  }

  async function review(row: Row, decision: "approve" | "reject") {
    let reason: string | undefined;
    if (decision === "reject") {
      const answer = window.prompt(`What should ${row.vendor?.businessName ?? "the vendor"} fix on "${row.title}"? They will see this.`);
      if (!answer || !answer.trim()) return;
      reason = answer.trim();
    }
    setError("");
    try {
      await api(`/admin/products/${row._id}/review`, { method: "PATCH", token, body: { decision, reason } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the decision");
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/products/new" className="inline-flex min-h-11 items-center rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90">
          Add product
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <label htmlFor="status">Show</label>
        <select
          id="status"
          value={filter}
          onChange={(e) => {
            setRows(null);
            setFilter(e.target.value);
          }}
          className="border border-[#C6C6CB] bg-white px-3 py-2"
        >
          <option value="">All</option>
          <option value="active">Live</option>
          <option value="pending">{isAdmin ? "Waiting for your review" : "In review"}</option>
          <option value="rejected">Needs changes</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      <ErrorText message={error} />

      {rows === null ? (
        <p className="text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="border border-line bg-white p-6 text-muted">
          {isAdmin ? "No products here. Add a category first, then click Add product." : "No products here yet. Click Add product to list your first one."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-line bg-[#F3F4F5]">
              <tr>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = STATUS[r.status];
                return (
                  <tr key={r._id} className="border-b border-line last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {r.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.images[0].url} alt="" className="h-12 w-12 object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center bg-surface text-xs text-muted">None</span>
                        )}
                        <span>
                          <span className="font-medium">{r.title}</span>
                          {isAdmin && (
                            <span className="block text-[13px] text-muted">{r.vendor ? `By ${r.vendor.businessName}` : "Your own product"}</span>
                          )}
                          {r.status === "rejected" && r.rejectionReason && (
                            <span className="block text-[13px] text-[#B42318]">Fix: {r.rejectionReason}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">{r.category?.name ?? "-"}</td>
                    <td className="p-3">{naira.format(r.price)}</td>
                    <td className="p-3">{r.stock === 0 ? <span className="text-[#B42318]">Out of stock</span> : r.stock}</td>
                    <td className="p-3">
                      <span className={`rounded-sm px-2 py-1 text-xs font-medium ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {isAdmin && r.status === "pending" && (
                        <>
                          <button type="button" onClick={() => review(r, "approve")} className="mr-2 min-h-11 cursor-pointer rounded-sm bg-foreground px-4 text-sm font-semibold text-white">
                            Approve
                          </button>
                          <button type="button" onClick={() => review(r, "reject")} className="mr-3 min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-4 text-sm font-semibold text-[#B42318]">
                            Reject
                          </button>
                        </>
                      )}
                      <Link href={`/products/${r._id}`} className="mr-4 hover:text-accent-ink">
                        Edit
                      </Link>
                      <button onClick={() => remove(r)} className="cursor-pointer text-[#B42318] hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
