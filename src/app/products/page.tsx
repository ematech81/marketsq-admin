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
  images: { url: string }[];
  category?: { name: string };
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function ProductsPage() {
  return (
    <Shell>
      <ProductList />
    </Shell>
  );
}

function ProductList() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const qs = filter ? `?status=${filter}` : "";
      const res = await api<{ products: Row[] }>(`/admin/products${qs}`, { token });
      setRows(res.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products");
    }
  }, [token, filter]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function remove(row: Row) {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    try {
      await api(`/admin/products/${row._id}`, { method: "DELETE", token });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the product");
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/products/new" className="bg-accent inline-flex min-h-11 items-center rounded-sm px-5 text-sm font-semibold text-foreground hover:opacity-90">
          Add product
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <label htmlFor="status">Show</label>
        <select
          id="status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-[#C6C6CB] bg-white px-3 py-2"
        >
          <option value="">All</option>
          <option value="active">Live</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      <ErrorText message={error} />

      {rows === null ? (
        <p className="text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="border border-line p-6 text-muted">
          No products yet. Add a category first, then click Add product.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line">
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
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-line last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {r.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.images[0].url} alt="" className="h-12 w-12 object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center bg-surface text-xs text-muted">
                          None
                        </span>
                      )}
                      <span className="font-medium">{r.title}</span>
                    </div>
                  </td>
                  <td className="p-3">{r.category?.name ?? "-"}</td>
                  <td className="p-3">{naira.format(r.price)}</td>
                  <td className="p-3">{r.stock === 0 ? <span className="text-red-800">Out of stock</span> : r.stock}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium ${
                        r.status === "active" ? "bg-[#DCFCE7] text-[#14532D]" : "bg-surface"
                      }`}
                    >
                      {r.status === "active" ? "Live" : r.status === "draft" ? "Draft" : r.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/products/${r._id}`} className="mr-4 hover:text-accent">
                      Edit
                    </Link>
                    <button onClick={() => remove(r)} className="text-red-800 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
