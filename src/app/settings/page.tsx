"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText, Field, PrimaryButton } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Settings = { defaultCommissionRate: number; minPayoutAmount: number; requireListingApproval: boolean };

export default function SettingsPage() {
  return (
    <Shell adminOnly>
      <SettingsForm />
    </Shell>
  );
}

function SettingsForm() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: Settings }>("/admin/settings", { token })
      .then((r) => setSettings(r.settings))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"));
  }, [token]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await api<{ settings: Settings }>("/admin/settings", {
        method: "PUT",
        token,
        body: {
          defaultCommissionRate: Number(f.get("commission")),
          minPayoutAmount: Number(f.get("minPayout")),
          requireListingApproval: f.get("approval") === "on",
        },
      });
      setSettings(res.settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Settings</h1>
        <p className="mt-1 text-sm text-[#45474B]">Rules for vendors who sell on Square Market. Changes apply from now on.</p>
      </div>
      <ErrorText message={error} />
      {!settings ? (
        !error && <p className="text-muted">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-sm border border-line bg-white p-6">
          <Field
            label="Commission (%)"
            name="commission"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={settings.defaultCommissionRate}
            hint="Square Market keeps this share of each vendor sale. You can give one vendor a different rate on the Vendors page."
            required
          />
          <Field
            label="Smallest payout (₦)"
            name="minPayout"
            type="number"
            min={0}
            step={1}
            defaultValue={settings.minPayoutAmount}
            hint="A vendor cannot ask to be paid less than this."
            required
          />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="approval" defaultChecked={settings.requireListingApproval} className="mt-0.5 size-[18px] accent-accent" />
            <span>
              <span className="font-medium">Check vendor products before they go live</span>
              <span className="block text-[13px] text-muted">
                When on, a vendor&apos;s new product, or a changed title, description, category or photo, waits for your approval.
                Price and stock changes go live straight away.
              </span>
            </span>
          </label>
          <div className="flex items-center gap-4">
            <PrimaryButton type="submit" busy={busy}>
              Save settings
            </PrimaryButton>
            {saved && <span role="status" className="text-sm text-[#166534]">Saved</span>}
          </div>
        </form>
      )}
    </div>
  );
}
