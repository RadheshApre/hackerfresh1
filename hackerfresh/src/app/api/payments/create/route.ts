import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { razorpayClient } from "@/lib/payments/razorpay";
import { getPlan } from "@/lib/plans";
import { paymentsConfigured } from "@/lib/env";

const Body = z.object({ planId: z.string(), mode: z.enum(["one_time", "autopay"]) }).strict(); // NOTE: no amount field accepted

export async function POST(req: Request) {
  if (!paymentsConfigured()) return NextResponse.json({ error: "Payments are not configured yet. Add Razorpay keys (see README)." }, { status: 503 });

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const plan = getPlan(parsed.data.planId);               // trusted plan lookup; price comes from server config
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  const rzp = razorpayClient();
  const db = supabaseAdmin();
  const keyId = process.env.RAZORPAY_KEY_ID!;

  try {
    if (parsed.data.mode === "one_time") {
      const order = await rzp.orders.create({
        amount: plan.amountPaise, currency: "INR", receipt: `hf_${Date.now().toString(36)}`,
        notes: { user_id: user.id, plan_id: plan.id },
      });
      const { data: pay, error } = await db.from("payments").insert({
        user_id: user.id, plan_id: plan.id, kind: "one_time", amount_paise: plan.amountPaise, status: "created", razorpay_order_id: order.id,
      }).select("id").single();
      if (error) throw error;
      return NextResponse.json({ kind: "one_time", keyId, orderId: order.id, amount: plan.amountPaise, currency: "INR", paymentRef: pay.id, label: plan.label });
    }

    // UPI AutoPay / recurring via Razorpay Subscriptions. The Razorpay Plan id is server config, never client input.
    const rzpPlanId = process.env[plan.razorpayPlanEnv];
    if (!rzpPlanId) return NextResponse.json({ error: "Recurring billing for this plan is not set up yet." }, { status: 503 });
    const sub = await rzp.subscriptions.create({
      plan_id: rzpPlanId, total_count: plan.periodMonths === 12 ? 5 : 12, customer_notify: 1,
      notes: { user_id: user.id, plan_id: plan.id },
    });
    await db.from("subscriptions").upsert({
      user_id: user.id, razorpay_subscription_id: sub.id, plan_id: plan.id, status: "created", updated_at: new Date().toISOString(),
      // tier is deliberately NOT changed here: no access until a verified webhook says the charge succeeded.
    }, { onConflict: "user_id" });
    const { data: pay, error } = await db.from("payments").insert({
      user_id: user.id, plan_id: plan.id, kind: "subscription", amount_paise: plan.amountPaise, status: "created", razorpay_subscription_id: sub.id,
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ kind: "subscription", keyId, subscriptionId: sub.id, paymentRef: pay.id, label: plan.label });
  } catch (e) {
    console.error("payments.create failed", (e as Error).message); // never log secrets / full payloads
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }
}
