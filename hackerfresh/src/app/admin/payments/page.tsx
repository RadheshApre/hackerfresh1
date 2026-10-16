import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ReviewButtons from "@/components/ReviewButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manual payments", robots: { index: false, follow: false } };

export default async function ManualPayments() {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) notFound();
  const db = supabaseAdmin();
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") notFound();
  const { data: rows } = await db.from("manual_payments").select("id,created_at,plan_id,amount_paise,utr,status").order("created_at", { ascending: false }).limit(100);
  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Manual UPI payments</h1>
      <p>For each pending row: open your UPI app / bank statement, find the UTR, confirm the <b>amount</b> matches, then approve.</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Submitted</th><th align="left">Plan</th><th align="left">Expected</th><th align="left">UTR</th><th align="left">Status</th><th /></tr></thead><tbody>
        {(rows ?? []).map((r) => (
          <tr key={r.id} style={{ borderTop: "1px solid #232c4d" }}>
            <td>{new Date(r.created_at).toLocaleString("en-IN")}</td><td>{r.plan_id}</td><td>₹{(r.amount_paise / 100).toLocaleString("en-IN")}</td><td>{r.utr}</td><td>{r.status}</td>
            <td>{r.status === "pending" && <ReviewButtons id={r.id} />}</td>
          </tr>))}
      </tbody></table>
      <p><a href="/admin">← Overview</a></p>
    </main>
  );
}
