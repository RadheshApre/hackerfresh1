import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { fakeDb } from "./fakeDb";

const h = (s: string, k: string) => crypto.createHmac("sha256", k).update(s).digest("hex");
let db: any; let user: { id: string } | null = { id: "u1" };
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => db }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }));
const fetchMock = vi.fn();
vi.mock("@/lib/payments/razorpay", () => ({ razorpayClient: () => ({ payments: { fetch: fetchMock } }) }));

const seed = () => ({
  payments: [{ id: "p1", user_id: "u1", plan_id: "starter_monthly", kind: "one_time", amount_paise: 9900, status: "created", razorpay_order_id: "order_1" }],
  subscriptions: [{ user_id: "u1", tier: "free", status: "none", current_period_end: null }],
  profiles: [{ id: "u1", free_uses_consumed: 0, role: "user" }],
  webhook_events: [], usage_records: [],
});
beforeEach(() => {
  process.env.RAZORPAY_KEY_SECRET = "ksec"; process.env.RAZORPAY_WEBHOOK_SECRET = "wsec"; process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  db = fakeDb(seed(), { consume_free_use: ({ p_user, p_limit }) => { const p = db.tables.profiles.find((r: any) => r.id === p_user); if (p.free_uses_consumed < p_limit) { p.free_uses_consumed++; return true; } return false; } });
  user = { id: "u1" }; fetchMock.mockReset();
});

const post = (url: string, body: string, headers: Record<string, string> = {}) => new Request(url, { method: "POST", body, headers });
const capturedEvt = (amount = 9900, id = "pay_1") => JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id, order_id: "order_1", amount, status: "captured", method: "upi" } } } });

describe("webhook route", () => {
  it("rejects bad signature and changes nothing", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const body = capturedEvt();
    const res = await POST(post("http://x/w", body, { "x-razorpay-signature": "bad", "x-razorpay-event-id": "e1" }));
    expect(res.status).toBe(400);
    expect(db.tables.subscriptions[0].tier).toBe("free"); expect(db.tables.webhook_events).toHaveLength(0);
  });
  it("valid captured event unlocks the plan from SERVER price; duplicate event is a no-op", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const body = capturedEvt(); const hdr = { "x-razorpay-signature": h(body, "wsec"), "x-razorpay-event-id": "evt_A" };
    expect((await POST(post("http://x/w", body, hdr))).status).toBe(200);
    const end1 = db.tables.subscriptions[0].current_period_end;
    expect(db.tables.subscriptions[0]).toMatchObject({ tier: "starter", status: "active" });
    const dup = await POST(post("http://x/w", body, hdr));
    expect((await dup.json()).duplicate).toBe(true);
    expect(db.tables.subscriptions[0].current_period_end).toBe(end1); // not extended twice
  });
  it("same payment re-delivered under a NEW event id still does not extend twice", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const body = capturedEvt();
    await POST(post("http://x/w", body, { "x-razorpay-signature": h(body, "wsec"), "x-razorpay-event-id": "evt_1" }));
    const end1 = db.tables.subscriptions[0].current_period_end;
    await POST(post("http://x/w", body, { "x-razorpay-signature": h(body, "wsec"), "x-razorpay-event-id": "evt_2" }));
    expect(db.tables.subscriptions[0].current_period_end).toBe(end1);
  });
  it("amount mismatch grants nothing", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const body = capturedEvt(100);
    await POST(post("http://x/w", body, { "x-razorpay-signature": h(body, "wsec"), "x-razorpay-event-id": "evt_B" }));
    expect(db.tables.subscriptions[0].tier).toBe("free");
  });
  it("failed payment is recorded and grants nothing; refund revokes", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const fail = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_f", order_id: "order_1", error_description: "declined" } } } });
    await POST(post("http://x/w", fail, { "x-razorpay-signature": h(fail, "wsec"), "x-razorpay-event-id": "evt_F" }));
    expect(db.tables.payments[0].status).toBe("failed"); expect(db.tables.subscriptions[0].tier).toBe("free");
    db.tables.payments[0].status = "created";
    const ok = capturedEvt(); await POST(post("http://x/w", ok, { "x-razorpay-signature": h(ok, "wsec"), "x-razorpay-event-id": "evt_P" }));
    expect(db.tables.subscriptions[0].tier).toBe("starter");
    const rf = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { payment_id: "pay_1" } } } });
    await POST(post("http://x/w", rf, { "x-razorpay-signature": h(rf, "wsec"), "x-razorpay-event-id": "evt_R" }));
    expect(db.tables.subscriptions[0]).toMatchObject({ tier: "free", status: "refunded" }); expect(db.tables.payments[0].status).toBe("refunded");
  });
});

describe("verify route: cannot unlock premium with forged client data", () => {
  it("rejects a forged signature", async () => {
    const { POST } = await import("@/app/api/payments/verify/route");
    const res = await POST(post("http://x/v", JSON.stringify({ paymentRef: "00000000-0000-4000-8000-000000000001", razorpay_payment_id: "pay_1", razorpay_signature: "forged_forged" })));
    expect([400, 404]).toContain(res.status); expect(db.tables.subscriptions[0].tier).toBe("free");
  });
  it("rejects extra fields like status/amount/plan (strict schema)", async () => {
    const { POST } = await import("@/app/api/payments/verify/route");
    const res = await POST(post("http://x/v", JSON.stringify({ paymentRef: "00000000-0000-4000-8000-000000000001", razorpay_payment_id: "pay_1", razorpay_signature: "x".repeat(20), status: "paid", amount: 1, tier: "starter" })));
    expect(res.status).toBe(400); expect(db.tables.subscriptions[0].tier).toBe("free");
  });
  it("valid signature but Razorpay says NOT captured => stays pending, no premium", async () => {
    db.tables.payments[0].id = "11111111-1111-4111-8111-111111111111";
    fetchMock.mockResolvedValue({ id: "pay_1", order_id: "order_1", status: "authorized", amount: 9900 });
    const { POST } = await import("@/app/api/payments/verify/route");
    const res = await POST(post("http://x/v", JSON.stringify({ paymentRef: "11111111-1111-4111-8111-111111111111", razorpay_payment_id: "pay_1", razorpay_signature: h("order_1|pay_1", "ksec") })));
    expect((await res.json()).status).toBe("pending"); expect(db.tables.subscriptions[0].tier).toBe("free");
  });
  it("valid signature + captured at Razorpay + matching amount => paid", async () => {
    db.tables.payments[0].id = "11111111-1111-4111-8111-111111111111";
    fetchMock.mockResolvedValue({ id: "pay_1", order_id: "order_1", status: "captured", amount: 9900, method: "upi" });
    const { POST } = await import("@/app/api/payments/verify/route");
    const res = await POST(post("http://x/v", JSON.stringify({ paymentRef: "11111111-1111-4111-8111-111111111111", razorpay_payment_id: "pay_1", razorpay_signature: h("order_1|pay_1", "ksec") })));
    expect((await res.json()).status).toBe("paid"); expect(db.tables.subscriptions[0].tier).toBe("starter");
  });
  it("another user's payment ref is not accessible", async () => {
    user = { id: "attacker" };
    db.tables.payments[0].id = "11111111-1111-4111-8111-111111111111";
    const { POST } = await import("@/app/api/payments/verify/route");
    const res = await POST(post("http://x/v", JSON.stringify({ paymentRef: "11111111-1111-4111-8111-111111111111", razorpay_payment_id: "pay_1", razorpay_signature: h("order_1|pay_1", "ksec") })));
    expect(res.status).toBe(404);
  });
});

describe("subscription (UPI AutoPay) webhooks", () => {
  const sub = (event: string, extra = {}) => JSON.stringify({ event, payload: { subscription: { entity: { id: "sub_1", current_end: Math.floor(Date.now() / 1000) + 86400 * 30 } }, ...extra } });
  const send = async (body: string, id: string) => (await import("@/app/api/webhooks/razorpay/route")).POST(post("http://x/w", body, { "x-razorpay-signature": h(body, "wsec"), "x-razorpay-event-id": id }));
  beforeEach(() => { Object.assign(db.tables.subscriptions[0], { razorpay_subscription_id: "sub_1", plan_id: "starter_monthly", status: "created" }); });
  it("authenticated alone grants nothing; charged grants; halted revokes", async () => {
    await send(sub("subscription.authenticated"), "s1"); expect(db.tables.subscriptions[0].tier).toBe("free");
    await send(sub("subscription.charged", { payment: { entity: { id: "pay_s1", amount: 9900, method: "upi" } } }), "s2");
    expect(db.tables.subscriptions[0]).toMatchObject({ tier: "starter", status: "active" }); expect(db.tables.payments.some((p: any) => p.razorpay_payment_id === "pay_s1")).toBe(true);
    await send(sub("subscription.halted"), "s3"); expect(db.tables.subscriptions[0].tier).toBe("free");
  });
  it("cancelled keeps access until period end, then expiry removes it", async () => {
    await send(sub("subscription.charged", { payment: { entity: { id: "pay_s2", amount: 9900 } } }), "c1");
    await send(sub("subscription.cancelled"), "c2");
    const { effectiveTier } = await import("@/lib/payments/entitlements");
    expect(effectiveTier(db.tables.subscriptions[0])).toBe("starter");
    db.tables.subscriptions[0].current_period_end = new Date(Date.now() - 1000).toISOString();
    expect(effectiveTier(db.tables.subscriptions[0])).toBe("free");
  });
});

describe("free-tries gate", () => {
  it("allows 3 free uses, blocks the 4th with upgrade prompt; paid tier honours monthly cap", async () => {
    const { consumeToolUse } = await import("@/lib/usage");
    for (let i = 0; i < 3; i++) expect((await consumeToolUse(db, "u1", "resume_analyzer")).allowed).toBe(true);
    const r = await consumeToolUse(db, "u1", "resume_analyzer");
    expect(r).toMatchObject({ allowed: false, reason: "free_limit_reached", upgrade: true });
    Object.assign(db.tables.subscriptions[0], { tier: "starter", plan_id: "starter_monthly", status: "active", current_period_end: new Date(Date.now() + 864e6).toISOString() });
    expect((await consumeToolUse(db, "u1", "resume_analyzer")).allowed).toBe(true);
  });
});

describe("create route ignores client-supplied price", () => {
  it("rejects an amount field and unknown plans; requires sign-in", async () => {
    const { POST } = await import("@/app/api/payments/create/route");
    expect((await POST(post("http://x/c", JSON.stringify({ planId: "starter_monthly", mode: "one_time", amount: 1 })))).status).toBe(400);
    expect((await POST(post("http://x/c", JSON.stringify({ planId: "free_forever", mode: "one_time" })))).status).toBe(400);
    user = null; expect((await POST(post("http://x/c", JSON.stringify({ planId: "starter_monthly", mode: "one_time" })))).status).toBe(401);
  });
});
