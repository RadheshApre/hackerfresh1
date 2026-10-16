"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

declare global { interface Window { Razorpay: any } }

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js"; // official Razorpay Standard Checkout
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PayButton({ planId, mode, label }: { planId: string; mode: "one_time" | "autopay"; label: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function start() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/payments/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId, mode }) });
      const data = await res.json();
      if (res.status === 401) { router.push("/login?next=/pricing"); return; }
      if (!res.ok) { setMsg(data.error ?? "Could not start payment"); return; }
      if (!(await loadCheckout())) { setMsg("Could not load Razorpay Checkout. Check your connection."); return; }

      const common = {
        key: data.keyId, name: "HackerFresh", description: data.label, theme: { color: "#6d5dfc" },
        // Show UPI first (Intent apps / QR are controlled by your Razorpay Dashboard payment configuration).
        config: { display: { blocks: { upi: { name: "Pay with UPI", instruments: [{ method: "upi" }] } }, sequence: ["block.upi"], preferences: { show_default_blocks: true } } },
        handler: async (r: any) => {
          // The browser response is only a hint: the server re-verifies it and waits for the webhook.
          await fetch("/api/payments/verify", { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ paymentRef: data.paymentRef, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }) }).catch(() => {});
          router.push(`/billing/status?ref=${data.paymentRef}`);
        },
        modal: { ondismiss: () => setBusy(false) },
      };
      const options = data.kind === "subscription"
        ? { ...common, subscription_id: data.subscriptionId }
        : { ...common, order_id: data.orderId, amount: data.amount, currency: data.currency };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => setMsg("Payment failed. You have not been charged for premium access. Please try again."));
      rzp.open();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={start} disabled={busy} style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#6d5dfc", color: "white", fontWeight: 600, cursor: "pointer" }}>
        {busy ? "Opening checkout…" : label}
      </button>
      {msg && <p role="alert" style={{ color: "#ff9c9c" }}>{msg}</p>}
    </div>
  );
}
