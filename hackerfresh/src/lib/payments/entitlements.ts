import { PLANS, getPlan, type Tier } from "@/lib/plans";

export type SubStatus = "none" | "created" | "pending_payment" | "active" | "pending" | "halted" | "cancelled" | "expired" | "refunded" | "failed";
export interface SubRow {
  tier: Tier; plan_id: string | null; status: SubStatus;
  current_period_end: string | null; cancel_at_period_end: boolean;
}

/** Premium access is granted ONLY from rows written by verified webhooks / verified signatures. */
export function effectiveTier(sub: SubRow | null, now = new Date()): Tier {
  if (!sub || sub.tier === "free") return "free";
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const inPeriod = !!end && end.getTime() > now.getTime();
  // active: paid and in period. cancelled / pending (retrying): keep access only until paid period ends.
  if (sub.status === "active") return !end || inPeriod ? sub.tier : "free";
  if ((sub.status === "cancelled" || sub.status === "pending") && inPeriod) return sub.tier;
  return "free"; // halted, expired, refunded, failed, created, pending_payment, none
}

export function monthlyCap(sub: SubRow | null, now = new Date()): number {
  const tier = effectiveTier(sub, now);
  if (tier === "free") return 0;
  const plan = sub?.plan_id ? getPlan(sub.plan_id) : null;
  return plan?.monthlyToolUses ?? (tier === "pro" ? 60 : 15);
}

type Evt = { event: string; payload: any };
export interface SubPatch {
  status?: SubStatus; current_period_end?: string | null; cancel_at_period_end?: boolean;
  grantTier?: boolean; revokeTier?: boolean;
}

const iso = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);

/** Map a VERIFIED Razorpay subscription webhook to a DB patch. Unknown events => null (ignored). */
export function patchFromSubscriptionEvent(e: Evt): SubPatch | null {
  const s = e.payload?.subscription?.entity;
  const end = iso(s?.current_end);
  switch (e.event) {
    case "subscription.authenticated": return { status: "pending_payment" }; // mandate set, NOT yet paid
    case "subscription.activated":
    case "subscription.charged": return { status: "active", current_period_end: end, cancel_at_period_end: false, grantTier: true };
    case "subscription.pending": return { status: "pending" };               // retrying; access until period end
    case "subscription.halted": return { status: "halted", revokeTier: true };
    case "subscription.cancelled": return { status: "cancelled", current_period_end: end ?? undefined, cancel_at_period_end: true };
    case "subscription.completed": return { status: "expired", revokeTier: true };
    case "subscription.paused": return { status: "halted", revokeTier: true };
    case "subscription.resumed": return { status: "active", current_period_end: end, grantTier: true };
    default: return null;
  }
}

export function paymentStatusFromEvent(event: string): "paid" | "failed" | "refunded" | null {
  if (event === "payment.captured" || event === "order.paid") return "paid";
  if (event === "payment.failed") return "failed";
  if (event === "refund.processed" || event === "refund.created") return "refunded";
  return null;
}

/** Period end for one-time purchases: based on SERVER plan data, never client input. */
export function oneTimePeriodEnd(planId: string, from = new Date()): string | null {
  const plan = getPlan(planId);
  if (!plan) return null;
  const d = new Date(from);
  d.setMonth(d.getMonth() + plan.periodMonths);
  return d.toISOString();
}
export { PLANS };
