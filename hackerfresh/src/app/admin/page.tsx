import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Admin() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) notFound();
  const db = supabaseAdmin();
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle(); // role read server-side
  if (me?.role !== "admin") notFound(); // 404, not 403: don't reveal the page exists
  const { data: s } = await db.rpc("admin_stats");
  const { data: recent } = await db.from("payments").select("created_at,plan_id,kind,amount_paise,status,method").order("created_at", { ascending: false }).limit(15);
  const card = (k: string, v: string | number) => (
    <div key={k} style={{ background: "#141b34", padding: 16, borderRadius: 12, minWidth: 150 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{k}</div><div style={{ fontSize: 26, fontWeight: 700 }}>{v}</div>
    </div>);
  const inr = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Admin overview</h1>
      <p><a href="/admin/payments">Review manual UPI payments →</a></p>
      <p style={{ opacity: 0.7 }}>Visitors are counted by an anonymous cookie id (no IP stored). Counts are approximate.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {[["Visitors today", s.visitors_today], ["Visitors 7d", s.visitors_7d], ["Visitors 30d", s.visitors_30d], ["Page views 7d", s.page_views_7d],
          ["Sign-ups total", s.signups_total], ["Sign-ups 7d", s.signups_7d], ["Tool uses 7d", s.tool_uses_7d], ["Users out of free tries", s.users_out_of_free],
          ["Paid payments", s.paid_payments], ["Revenue", inr(s.revenue_paise)], ["Active subscribers", s.active_subscribers],
          ["Failed", s.failed_payments], ["Refunded", s.refunded_payments]].map(([k, v]) => card(k as string, v as any))}
      </div>
      <h2>Top pages (7d)</h2>
      <ul>{(s.top_pages_7d as any[]).map((p) => <li key={p.path}>{p.path} — {p.views}</li>)}</ul>
      <h2>Recent payments</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
        {(recent ?? []).map((p, i) => (
          <tr key={i} style={{ borderTop: "1px solid #232c4d" }}><td>{new Date(p.created_at).toLocaleString("en-IN")}</td><td>{p.plan_id}</td><td>{p.kind}</td><td>{inr(p.amount_paise)}</td><td>{p.method ?? "-"}</td><td>{p.status}</td></tr>))}
      </tbody></table>
    </main>
  );
}
