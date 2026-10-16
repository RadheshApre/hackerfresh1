"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function ReviewButtons({ id }: { id: string }) {
  const r = useRouter(); const [busy, setBusy] = useState(false);
  const act = async (action: "approve" | "reject") => {
    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} this payment? Confirm the UTR and amount in your UPI app first.`)) return;
    setBusy(true); await fetch("/api/admin/manual-payment/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action }) }); setBusy(false); r.refresh();
  };
  return <span><button disabled={busy} onClick={() => act("approve")}>Approve</button> <button disabled={busy} onClick={() => act("reject")}>Reject</button></span>;
}
