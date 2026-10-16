import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans";
import { oneTimePeriodEnd } from "@/lib/payments/entitlements";

const Body = z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]) }).strict();

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = supabaseAdmin();
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle(); // role checked server-side
  if (me?.role !== "admin") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id, action } = parsed.data;

  const { data: claimed } = await db.from("manual_payments") // compare-and-set: a payment can only be reviewed once
    .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id).eq("status", "pending").select("*");
  const row = claimed?.[0];
  if (!row) return NextResponse.json({ error: "Already reviewed or not found" }, { status: 409 });
  if (action === "reject") return NextResponse.json({ ok: true });

  const plan = getPlan(row.plan_id);
  if (!plan) return NextResponse.json({ error: "Plan no longer exists" }, { status: 500 });
  const { data: sub } = await db.from("subscriptions").select("current_period_end,status").eq("user_id", row.user_id).maybeSingle();
  const base = sub?.status === "active" && sub.current_period_end && new Date(sub.current_period_end) > new Date() ? new Date(sub.current_period_end) : new Date(); // renewals stack
  await db.from("subscriptions").upsert({
    user_id: row.user_id, tier: plan.tier, plan_id: plan.id, status: "active", razorpay_subscription_id: null,
    current_period_end: oneTimePeriodEnd(plan.id, base), cancel_at_period_end: true, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  await db.from("payments").insert({ user_id: row.user_id, plan_id: plan.id, kind: "one_time", amount_paise: row.amount_paise, status: "paid", method: "upi_manual" });
  return NextResponse.json({ ok: true });
}
