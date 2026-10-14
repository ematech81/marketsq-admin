"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Banner = {
  _id: string;
  title: string;
  image: { url: string };
  mobileImage?: { url: string };
  alt: string;
  link?: string;
  active: boolean;
};

export default function BannersPage() {
  return (
    <Shell adminOnly>
      <Banners />
    </Shell>
  );
}

function Banners() {
  const { token } = useAuth();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [max, setMax] = useState(6);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ banners: Banner[]; max: number }>("/admin/banners", { token });
      setBanners(res.banners);
      setMax(res.max);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load banners");
    }
  }, [token]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  const move = (i: number, to: number) => {
    if (!banners || to < 0 || to >= banners.length) return;
    const ids = banners.map((b) => b._id);
    [ids[i], ids[to]] = [ids[to], ids[i]];
    return run(banners[i]._id, () => api("/admin/banners-order", { method: "PATCH", token, body: { ids } }));
  };

  const full = (banners?.length ?? 0) >= max;
  const showing = banners?.filter((b) => b.active).length ?? 0;
  const small = "min-h-9 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-3 text-[13px] font-semibold hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold tracking-[-0.02em]">Home page banners</h1>
          <p className="mt-1 max-w-xl text-sm text-[#45474B]">
            The banner at the top of the store moves by itself every 5 seconds. Upload finished designs, for example from Canva, to show new items or promotions. Up to {max} banners.
          </p>
        </div>
        {full ? (
          <span className="rounded-sm border border-line bg-white px-4 py-3 text-sm text-[#45474B]">You have {max} banners. Remove one to add another.</span>
        ) : (
          <Link href="/banners/new" className="inline-flex min-h-11 items-center rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90">
            Add hero section
          </Link>
        )}
      </div>

      <ErrorText message={error} />

      {banners === null ? (
        !error && <p className="text-muted">Loading…</p>
      ) : banners.length === 0 ? (
        <p className="rounded-sm border border-line bg-white p-6 text-[#45474B]">
          No banners yet, so the home page shows the welcome text instead. Click <strong>Add hero section</strong> to upload your first design.
        </p>
      ) : (
        <>
          <p className="text-sm text-[#45474B]">
            {banners.length} of {max} added · {showing} showing on the home page
          </p>
          <ul className="flex flex-col gap-4">
            {banners.map((b, i) => (
              <li key={b._id} className="flex flex-wrap gap-5 rounded-sm border border-line bg-white p-4">
                <div className="w-full shrink-0 border border-line bg-surface sm:w-72">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image.url} alt={b.alt} className="block w-full object-cover" style={{ aspectRatio: "1600 / 470" }} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold">
                      {i + 1}. {b.title}
                    </span>
                    <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${b.active ? "bg-[#DCFCE7] text-[#14532D]" : "bg-surface text-muted"}`}>
                      {b.active ? "Showing" : "Hidden"}
                    </span>
                    {b.mobileImage && <span className="rounded-sm bg-surface px-2 py-0.5 text-xs">Phone picture</span>}
                  </div>
                  <p className="text-[13px] text-[#45474B]">{b.alt}</p>
                  <p className="truncate text-[13px] text-muted">{b.link ? `Links to ${b.link}` : "No link"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={small} disabled={busyId !== null || i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${b.title} earlier`}>
                      ↑ Earlier
                    </button>
                    <button type="button" className={small} disabled={busyId !== null || i === banners.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${b.title} later`}>
                      ↓ Later
                    </button>
                    <button
                      type="button"
                      className={small}
                      disabled={busyId !== null}
                      onClick={() => run(b._id, () => api(`/admin/banners/${b._id}/active`, { method: "PATCH", token, body: { active: !b.active } }))}
                    >
                      {b.active ? "Hide" : "Show"}
                    </button>
                    <Link href={`/banners/${b._id}`} className={`${small} inline-flex items-center`}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      className={`${small} text-[#B42318]`}
                      disabled={busyId !== null}
                      onClick={() => {
                        if (window.confirm(`Remove the banner "${b.title}"? This cannot be undone.`)) run(b._id, () => api(`/admin/banners/${b._id}`, { method: "DELETE", token }));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
