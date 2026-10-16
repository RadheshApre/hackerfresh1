import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { effectiveTier, type SubRow } from "@/lib/payments/entitlements";
import CancelButton from "@/components/CancelButton";

export const dynamic = "force-dynamic";
export default async function Billing() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/billing");
  const { data: sub } = await sb.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
  const { data: prof } = await sb.from("profiles").select("free_uses_consumed").eq("id", user.id).maybeSingle();
  const { data: pays } = await sb.from("payments").select("id,created_at,plan_id,kind,amount_paise,status,method").order("created_at", { ascending: false }).limit(50);
  const { data: manual } = await sb.from("manual_payments").select("id,created_at,plan_id,amount_paise,utr,status").order("created_at", { ascending: false }).limit(20);
  const tier = effectiveTier(sub as SubRow | null);
  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>Billing</h1>
      <p>Current plan: <b>{tier}</b>{sub?.current_period_end && tier !== "free" ? ` · access until ${new Date(sub.current_period_end).toLocaleDateString("en-IN")}` : ""}</p>
      {tier === "free" && <p>Free tries used: {prof?.free_uses_consumed ?? 0} of 3. <a href="/pricing">See plans</a></p>}
      {sub?.razorpay_subscription_id && ["active", "pending"].includes(sub.status) && !sub.cancel_at_period_end && <CancelButton />}
      {sub?.cancel_at_period_end && tier !== "free" && <p>Renewal is off. You keep access until the date above.</p>}
      {!!manual?.length && (<>
        <h2>UPI payment submissions</h2>
        <ul>{manual.map((m) => <li key={m.id}>{new Date(m.created_at).toLocaleString("en-IN")} · {m.plan_id} · ₹{(m.amount_paise / 100).toLocaleString("en-IN")} · UTR ••••{m.utr.slice(-4)} · <b>{m.status === "pending" ? "pending review" : m.status}</b></li>)}</ul>
      </>)}
      <h2>Transactions</h2>
      {!pays?.length ? <p>No transactions yet.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Date</th><th align="left">Plan</th><th align="left">Type</th><th align="left">Amount</th><th align="left">Method</th><th align="left">Status</th></tr></thead><tbody>
          {pays.map((p) => <tr key={p.id} style={{ borderTop: "1px solid #232c4d" }}><td>{new Date(p.created_at).toLocaleString("en-IN")}</td><td>{p.plan_id}</td><td>{p.kind}</td><td>₹{(p.amount_paise / 100).toLocaleString("en-IN")}</td><td>{p.method ?? "-"}</td><td><a href={`/billing/status?ref=${p.id}`}>{p.status}</a></td></tr>)}
        </tbody></table>)}
    </main>
  );
}
