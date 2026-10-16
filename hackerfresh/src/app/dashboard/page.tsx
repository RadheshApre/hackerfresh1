import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { effectiveTier, type SubRow } from "@/lib/payments/entitlements";
import { FREE_LIFETIME_USES, PLANS } from "@/lib/plans";
import ResumeDrafts from "@/components/ResumeDrafts";
import Thumb from "@/components/Thumb";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — HackerFresh", robots: { index: false } };

export default async function Dashboard() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");
  const { data: prof } = await sb.from("profiles").select("free_uses_consumed").eq("id", user.id).maybeSingle();
  const { data: sub } = await sb.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
  const { data: pending } = await sb.from("manual_payments").select("id").eq("status", "pending");
  const tier = effectiveTier(sub as SubRow | null);
  const used = prof?.free_uses_consumed ?? 0; const left = Math.max(0, FREE_LIFETIME_USES - used);
  return (
    <main className="container dash">
      <h1>Welcome back 👋</h1><p className="note">{user.email}</p>
      <div className="stats">
        <div className="card stat"><div className="l">Plan</div><div className="n" style={{ textTransform: "capitalize" }}>{tier}</div>
          {sub?.current_period_end && tier !== "free" && <div className="l">Active until {new Date(sub.current_period_end).toLocaleDateString("en-IN")}</div>}</div>
        {tier === "free" && <div className="card stat"><div className="l">Free downloads left</div><div className="n">{left} <small style={{ fontSize: 16, color: "var(--mute)" }}>/ {FREE_LIFETIME_USES}</small></div><div className="bar"><i style={{ width: `${(left / FREE_LIFETIME_USES) * 100}%` }} /></div></div>}
        {tier !== "free" && <div className="card stat"><div className="l">Monthly download cap</div><div className="n">{PLANS.starter_monthly.monthlyToolUses}</div></div>}
        <div className="card stat"><div className="l">Payments awaiting review</div><div className="n">{pending?.length ?? 0}</div><div className="l"><a href="/billing">Billing &amp; history</a></div></div>
      </div>
      {tier === "free" && left === 0 && <p className="warn">You’ve used all free downloads. <a href="/pricing">Get Starter for ₹{PLANS.starter_monthly.amountPaise / 100}/month</a> to keep downloading. Editing and previewing stay free.</p>}
      <div className="two" style={{ marginTop: 16 }}>
        <div className="card"><h3 style={{ marginTop: 0 }}>Your resume</h3><ResumeDrafts />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}><a className="btn btn-primary" href="/builder">Open builder</a><a className="btn" href="/builder#checker">Run resume checker</a>{tier === "free" && <a className="btn" href="/pricing">Upgrade</a>}</div>
          <h3>Quick ATS tips</h3>
          <ul className="ticks"><li>Use standard headings: Summary, Skills, Experience, Education.</li><li>Keep to one column; avoid tables, images and icons.</li><li>Mirror important keywords from the job post, only where true.</li><li>Start bullets with action verbs and add real numbers.</li></ul></div>
        <div className="card"><h3 style={{ marginTop: 0 }}>Templates</h3><div style={{ maxWidth: 240 }}><Thumb template="classic" scale={0.3} /></div><p className="note">Sample data. Pick a template inside the builder.</p></div>
      </div>
    </main>);
}
