import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";
const COPY: Record<string, [string, string]> = {
  created: ["Waiting for payment", "We haven’t received a payment yet."],
  pending: ["Payment processing", "Your bank/UPI app is confirming this. Premium unlocks once Razorpay confirms it. This can take a minute."],
  paid: ["Payment confirmed", "Thank you! Your plan is active."],
  failed: ["Payment failed", "No premium access was granted. You can try again from the pricing page."],
  cancelled: ["Payment cancelled", "No premium access was granted."],
  refunded: ["Payment refunded", "Premium access linked to this payment has been removed."],
  expired: ["Payment expired", "Please start a new payment."],
};

export default async function Status({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !ref) notFound();
  const { data: p } = await sb.from("payments").select("status,plan_id,amount_paise,created_at").eq("id", ref).maybeSingle(); // RLS: own rows only
  if (!p) notFound();
  const [title, body] = COPY[p.status] ?? ["Status unknown", ""];
  return (
    <main style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <AutoRefresh active={p.status === "created" || p.status === "pending"} />
      <h1>{title}</h1><p>{body}</p>
      <p style={{ opacity: 0.7 }}>{p.plan_id} · ₹{(p.amount_paise / 100).toLocaleString("en-IN")}</p>
      <p><a href="/billing">View transaction history</a></p>
    </main>
  );
}
