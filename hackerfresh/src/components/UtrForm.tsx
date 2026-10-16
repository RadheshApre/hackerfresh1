"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UtrForm({ planId }: { planId: string }) {
  const [utr, setUtr] = useState(""); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/manual-payment/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId, utr: utr.trim() }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) return router.push("/login?next=/pricing");
    if (!res.ok) return setMsg(data.error ?? "Could not submit");
    router.push("/billing");
  }
  return (
    <div>
      <label>UTR / reference number (12 digits)
        <input inputMode="numeric" maxLength={12} value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))} style={{ display: "block" }} />
      </label>
      <button onClick={submit} disabled={busy || utr.length !== 12}>{busy ? "Submitting…" : "I have paid — submit"}</button>
      {msg && <p role="alert" style={{ color: "#ff9c9c" }}>{msg}</p>}
    </div>
  );
}
