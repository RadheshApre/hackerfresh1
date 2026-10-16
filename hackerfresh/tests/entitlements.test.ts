import { describe, it, expect } from "vitest";
import { effectiveTier, patchFromSubscriptionEvent, paymentStatusFromEvent, type SubRow } from "@/lib/payments/entitlements";

const future = new Date(Date.now() + 864e5 * 10).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();
const row = (o: Partial<SubRow>): SubRow => ({ tier: "pro", plan_id: "pro_monthly", status: "active", current_period_end: future, cancel_at_period_end: false, ...o });

describe("effectiveTier", () => {
  it("grants access only for paid, in-period states", () => {
    expect(effectiveTier(row({}))).toBe("pro");
    expect(effectiveTier(row({ status: "cancelled" }))).toBe("pro");       // keeps access until period end
    expect(effectiveTier(row({ status: "pending" }))).toBe("pro");        // retrying, still in paid period
  });
  it("denies unpaid / failed / ended states", () => {
    for (const status of ["created", "pending_payment", "halted", "expired", "refunded", "failed", "none"] as const)
      expect(effectiveTier(row({ status }))).toBe("free");
  });
  it("expires after the period ends (cancellation/expiry)", () => {
    expect(effectiveTier(row({ current_period_end: past }))).toBe("free");
    expect(effectiveTier(row({ status: "cancelled", current_period_end: past }))).toBe("free");
  });
  it("a row claiming tier=free or missing row is free", () => {
    expect(effectiveTier(row({ tier: "free" }))).toBe("free");
    expect(effectiveTier(null)).toBe("free");
  });
});

describe("webhook -> patch mapping", () => {
  const ent = (event: string, current_end = 1900000000) => ({ event, payload: { subscription: { entity: { id: "sub_1", current_end } } } });
  it("authenticated does NOT grant access (mandate set up, not yet paid)", () => {
    const p = patchFromSubscriptionEvent(ent("subscription.authenticated"))!;
    expect(p.grantTier).toBeUndefined(); expect(p.status).toBe("pending_payment");
  });
  it("charged/activated grants with a period end from Razorpay", () => {
    for (const e of ["subscription.charged", "subscription.activated"]) {
      const p = patchFromSubscriptionEvent(ent(e))!; expect(p.grantTier).toBe(true); expect(p.current_period_end).toBeTruthy();
    }
  });
  it("halted / completed revoke; cancelled keeps period; unknown ignored", () => {
    expect(patchFromSubscriptionEvent(ent("subscription.halted"))!.revokeTier).toBe(true);
    expect(patchFromSubscriptionEvent(ent("subscription.completed"))!.revokeTier).toBe(true);
    expect(patchFromSubscriptionEvent(ent("subscription.cancelled"))!.revokeTier).toBeUndefined();
    expect(patchFromSubscriptionEvent(ent("subscription.something_new"))).toBeNull();
  });
  it("payment event mapping", () => {
    expect(paymentStatusFromEvent("payment.captured")).toBe("paid");
    expect(paymentStatusFromEvent("payment.authorized")).toBeNull(); // authorized != money received
    expect(paymentStatusFromEvent("payment.failed")).toBe("failed");
    expect(paymentStatusFromEvent("refund.processed")).toBe("refunded");
  });
});
