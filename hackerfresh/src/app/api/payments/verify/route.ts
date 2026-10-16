import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { razorpayClient } from "@/lib/payments/razorpay";
import { verifyOrderSignature, verifySubscriptionSignature } from "@/lib/payments/signatures";
import { fulfilOneTime } from "@/lib/payments/fulfil";

const Body = z.object({
  paymentRef: z.string().uuid(),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(256),
}).strict(); // client-supplied order/subscription ids and any "status" field are ignored/rejected

/**
 * The browser callback is only a HINT. We (1) load OUR stored order/subscription id,
 * (2) check the signature with it, (3) for orders, confirm with Razorpay's API that the payment is captured
 * and the amount matches. Subscriptions are granted only by the webhook.
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;

  const db = supabaseAdmin();
  const { data: pay } = await db.from("payments").select("*").eq("id", b.paymentRef).eq("user_id", user.id).maybeSingle();
  if (!pay) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const secret = process.env.RAZORPAY_KEY_SECRET!;

  if (pay.kind === "one_time") {
    if (!verifyOrderSignature(pay.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature, secret))
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    try {
      const rp: any = await razorpayClient().payments.fetch(b.razorpay_payment_id);
      if (rp.order_id !== pay.razorpay_order_id) return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
      if (rp.status === "captured") {
        const r = await fulfilOneTime(db, { orderId: rp.order_id, paymentId: rp.id, amountPaise: rp.amount, method: rp.method });
        return NextResponse.json({ status: r.ok ? "paid" : "failed", paymentRef: pay.id });
      }
      // authorized-but-not-captured, or still processing: stay pending, webhook will finish it.
      await db.from("payments").update({ status: "pending", razorpay_payment_id: rp.id, updated_at: new Date().toISOString() }).eq("id", pay.id).neq("status", "paid");
      return NextResponse.json({ status: "pending", paymentRef: pay.id });
    } catch (e) {
      console.error("payments.verify fetch failed", (e as Error).message);
      return NextResponse.json({ status: "pending", paymentRef: pay.id }); // webhook remains the source of truth
    }
  }

  // subscription: subscription_id comes from OUR DB, per Razorpay's documented verification
  if (!verifySubscriptionSignature(b.razorpay_payment_id, pay.razorpay_subscription_id, b.razorpay_signature, secret))
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  await db.from("payments").update({ status: "pending", razorpay_payment_id: b.razorpay_payment_id, updated_at: new Date().toISOString() }).eq("id", pay.id).neq("status", "paid");
  return NextResponse.json({ status: "pending", paymentRef: pay.id }); // access unlocks on subscription.charged/activated webhook
}
