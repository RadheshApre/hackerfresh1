import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { razorpayClient } from "@/lib/payments/razorpay";

export async function POST() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const db = supabaseAdmin();
  const { data: sub } = await db.from("subscriptions").select("razorpay_subscription_id,status").eq("user_id", user.id).maybeSingle();
  if (!sub?.razorpay_subscription_id || !["active", "pending", "pending_payment", "created"].includes(sub.status))
    return NextResponse.json({ error: "No cancellable subscription" }, { status: 400 });
  try {
    await razorpayClient().subscriptions.cancel(sub.razorpay_subscription_id, true); // true = at end of current cycle
    await db.from("subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    return NextResponse.json({ ok: true }); // final status still arrives via webhook
  } catch (e) {
    console.error("cancel failed", (e as Error).message);
    return NextResponse.json({ error: "Could not cancel right now" }, { status: 502 });
  }
}
