"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorText } from "./form";

export type VendorRow = {
  _id: string;
  businessName: string;
  category: string;
  state: string;
  city: string;
  phone: string;
  rcNumber?: string;
  idType: string;
  idNumber: string;
  bank: { bankName: string; accountNumber: string; accountName: string };
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  createdAt: string;
  user?: { name: string; email: string; phone: string };
};

const ID_LABEL: Record<string, string> = {
  nin: "NIN",
  drivers_license: "Driver's licence",
  passport: "Passport",
  voters_card: "Voter's card",
};

const th = "px-4 py-3 font-semibold first:pl-6 last:pr-6";
const td = "px-4 py-3.5 first:pl-6 last:pr-6";

// The table of vendor applications, with the approve / reject buttons. Used on Overview and on the Vendors page.
export default function VendorTable({ rows, onChanged }: { rows: VendorRow[]; onChanged: () => void }) {
  const { token } = useAuth();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(row: VendorRow, status: "approved" | "rejected" | "suspended") {
    let reason: string | undefined;
    if (status === "rejected") {
      const answer = window.prompt(`Why is "${row.businessName}" not approved? The applicant will see this.`);
      if (!answer || !answer.trim()) return;
      reason = answer.trim();
    }
    if (status === "suspended" && !window.confirm(`Suspend "${row.businessName}"? They will lose vendor access.`)) return;

    setBusyId(row._id);
    setError("");
    try {
      await api(`/admin/vendors/${row._id}/status`, { method: "PATCH", token, body: { status, reason } });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the decision");
    } finally {
      setBusyId(null);
    }
  }

  const btn = "min-h-11 cursor-pointer rounded-sm px-4 text-sm font-semibold disabled:opacity-60";

  return (
    <>
      {error && (
        <div className="px-6 pt-4">
          <ErrorText message={error} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-sm">
          <thead>
            <tr className="bg-[#F3F4F5] text-left">
              <th className={th}>Business</th>
              <th className={th}>Category</th>
              <th className={th}>Location</th>
              <th className={th}>Applied</th>
              <th className={`${th} text-right`}>Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v._id} className="border-t border-line align-top">
                <td className={td}>
                  <span className="font-semibold">{v.businessName}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {v.user?.name} · {v.user?.email} · {v.phone}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {ID_LABEL[v.idType] ?? v.idType} {v.idNumber}
                    {v.rcNumber ? ` · RC ${v.rcNumber}` : ""}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {v.bank.bankName} {v.bank.accountNumber} ({v.bank.accountName})
                  </span>
                  {v.status === "rejected" && v.rejectionReason && (
                    <span className="block text-[13px] text-[#B42318]">Rejected: {v.rejectionReason}</span>
                  )}
                </td>
                <td className={`${td} text-[#45474B]`}>{v.category}</td>
                <td className={`${td} text-[#45474B]`}>
                  {v.city}, {v.state}
                </td>
                <td className={`${td} text-[#45474B]`}>
                  {new Date(v.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  {v.status === "pending" || v.status === "rejected" ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === v._id}
                        onClick={() => decide(v, "approved")}
                        className={`${btn} bg-foreground text-white`}
                      >
                        Approve
                      </button>{" "}
                      {v.status === "pending" && (
                        <button
                          type="button"
                          disabled={busyId === v._id}
                          onClick={() => decide(v, "rejected")}
                          className={`${btn} border border-[#C6C6CB] bg-white text-[#B42318]`}
                        >
                          Reject
                        </button>
                      )}
                    </>
                  ) : v.status === "approved" ? (
                    <button
                      type="button"
                      disabled={busyId === v._id}
                      onClick={() => decide(v, "suspended")}
                      className={`${btn} border border-[#C6C6CB] bg-white text-[#B42318]`}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === v._id}
                      onClick={() => decide(v, "approved")}
                      className={`${btn} bg-foreground text-white`}
                    >
                      Reinstate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
