import { PLANS, FREE_LIFETIME_USES } from "@/lib/plans";
import { paymentsConfigured } from "@/lib/env";
import { paymentMode } from "@/lib/manual-upi";
import ManualPay from "@/components/ManualPay";
import PayButton from "@/components/PayButton";

export const dynamic = "force-dynamic"; // env-dependent values must be read at request time
export const metadata = { title: "Pricing — HackerFresh" };

export default function Pricing() {
  const p = PLANS.starter_monthly; const mode = paymentMode(); const live = mode === "razorpay" && paymentsConfigured();
  return (
    <main className="container section">
      <h1 style={{ fontSize: 40, margin: 0 }}>Pricing</h1>
      <p className="sub">Start free. Upgrade only when you need more downloads. Limits are fair-use caps, not “unlimited”.</p>
      <div className="price">
        <div className="card"><h3>Free</h3><div className="amt">₹0</div>
          <ul className="ticks"><li>Unlimited editing &amp; preview</li><li>All templates &amp; resume checker</li><li>{FREE_LIFETIME_USES} PDF downloads in total</li></ul><a className="btn" href="/builder">Open builder</a></div>
        <div className="card hl"><h3>Starter</h3><div className="amt">₹{p.amountPaise / 100}<small> / month</small></div>
          <ul className="ticks"><li>Up to {p.monthlyToolUses} PDF downloads per month</li><li>Everything in Free</li><li>One payment = 1 month of access</li></ul>
          {mode === "manual" && <ManualPay planId={p.id} />}
          {mode === "razorpay" && !live && <p className="warn">Online payments aren’t configured yet.</p>}
          {live && <><PayButton planId={p.id} mode="one_time" label="Pay once with UPI" /><div style={{ height: 8 }} /><PayButton planId={p.id} mode="autopay" label="Subscribe with UPI AutoPay" /></>}
        </div>
      </div>
      <p className="note" style={{ marginTop: 22 }}>We never see your UPI PIN. See the <a href="/refunds">refund policy</a>. We can’t guarantee interviews, jobs or ATS results.</p>
    </main>);
}
