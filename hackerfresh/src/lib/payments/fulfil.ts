import "server-only";
import { getPlan } from "@/lib/plans";
import { oneTimePeriodEnd, patchFromSubscriptionEvent, paymentStatusFromEvent } from "./entitlements";

type Admin = ReturnType<typeof import("@/lib/supabase/admin").supabaseAdmin>;

/** Grant a one-time plan after a CAPTURED payment whose amount matches OUR server-side price. Idempotent. */
export async function fulfilOneTime(db: Admin, p: { orderId: string; paymentId: string; amountPaise: number; method?: string | null }) {
  const { data: row } = await db.from("payments").select("*").eq("razorpay_order_id", p.orderId).maybeSingle();
  if (!row) return { ok: false as const, reason: "unknown_order" };
  if (row.status === "paid") return { ok: true as const, already: true };
  const plan = getPlan(row.plan_id);
  if (!plan || plan.amountPaise !== p.amountPaise || row.amount_paise !== p.amountPaise)
    return { ok: false as const, reason: "amount_mismatch" }; // never grant on a mismatched amount

  const { data: claimed } = await db.from("payments")
    .update({ status: "paid", razorpay_payment_id: p.paymentId, method: p.method ?? null, updated_at: new Date().toISOString() })
    .eq("id", row.id).neq("status", "paid").select("id"); // compare-and-set prevents double extension
  if (!claimed?.length) return { ok: true as const, already: true };

  const { data: sub } = await db.from("subscriptions").select("current_period_end,status").eq("user_id", row.user_id).maybeSingle();
  const base = sub?.status === "active" && sub.current_period_end && new Date(sub.current_period_end) > new Date() ? new Date(sub.current_period_end) : new Date();
  await db.from("subscriptions").upsert({
    user_id: row.user_id, tier: plan.tier, plan_id: plan.id, status: "active",
    current_period_end: oneTimePeriodEnd(plan.id, base), cancel_at_period_end: true, updated_at: new Date().toISOString(),
  });
  return { ok: true as const, already: false };
}

export async function handleWebhook(db: Admin, evt: { event: string; payload: any }) {
  const { event, payload } = evt;

  if (event.startsWith("subscription.")) {
    const subEntity = payload?.subscription?.entity;
    const subId: string | undefined = subEntity?.id;
    const patch = patchFromSubscriptionEvent(evt);
    if (!subId || !patch) return;
    const { data: row } = await db.from("subscriptions").select("user_id,plan_id").eq("razorpay_subscription_id", subId).maybeSingle();
    if (!row) return; // not ours (e.g. other product on same account)
    const update: Record<string, unknown> = { status: patch.status, updated_at: new Date().toISOString() };
    if (patch.current_period_end !== undefined) update.current_period_end = patch.current_period_end;
    if (patch.cancel_at_period_end !== undefined) update.cancel_at_period_end = patch.cancel_at_period_end;
    if (patch.grantTier) { const plan = getPlan(row.plan_id); if (plan) update.tier = plan.tier; }
    if (patch.revokeTier) update.tier = "free";
    await db.from("subscriptions").update(update).eq("user_id", row.user_id);

    // Record each successful recurring charge in transaction history.
    const pay = payload?.payment?.entity;
    if (event === "subscription.charged" && pay?.id) {
      const plan = getPlan(row.plan_id);
      await db.from("payments").upsert({
        user_id: row.user_id, plan_id: row.plan_id, kind: "subscription", amount_paise: pay.amount ?? plan?.amountPaise,
        status: "paid", razorpay_subscription_id: subId, razorpay_payment_id: pay.id, method: pay.method ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "razorpay_payment_id" });
    }
    return;
  }

  const pay = payload?.payment?.entity;
  const status = paymentStatusFromEvent(event);
  if (!status) return;

  if (status === "paid" && pay?.order_id && pay.status === "captured") {
    await fulfilOneTime(db, { orderId: pay.order_id, paymentId: pay.id, amountPaise: pay.amount, method: pay.method });
  } else if (status === "failed" && pay?.order_id) {
    await db.from("payments").update({ status: "failed", razorpay_payment_id: pay.id, failure_reason: pay.error_description ?? pay.error_reason ?? null, updated_at: new Date().toISOString() })
      .eq("razorpay_order_id", pay.order_id).neq("status", "paid");
  } else if (status === "refunded") {
    const paymentId = payload?.refund?.entity?.payment_id ?? pay?.id;
    if (!paymentId) return;
    const { data: row } = await db.from("payments").update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("razorpay_payment_id", paymentId).select("user_id").maybeSingle();
    if (row) await db.from("subscriptions").update({ tier: "free", status: "refunded", updated_at: new Date().toISOString() }).eq("user_id", row.user_id);
  }
}
