"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CancelButton() {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const r = useRouter();
  return (<div>
    <button disabled={busy} onClick={async () => {
      if (!confirm("Stop auto-renewal? You keep access until the end of the paid period.")) return;
      setBusy(true); const res = await fetch("/api/payments/cancel", { method: "POST" });
      if (!res.ok) setErr((await res.json()).error ?? "Failed"); else r.refresh(); setBusy(false);
    }}>Cancel auto-renewal</button>{err && <p role="alert">{err}</p>}</div>);
}
