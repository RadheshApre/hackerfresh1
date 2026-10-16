import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeDb } from "./fakeDb";

let db: any; let user: { id: string } | null;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => db }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }));
const ID = "11111111-1111-4111-8111-111111111111";
const post = (u: string, b: unknown) => new Request(u, { method: "POST", body: JSON.stringify(b) });

beforeEach(() => {
  process.env.UPI_ID = "test@ybl";
  db = fakeDb({
    profiles: [{ id: "u1", role: "user" }, { id: "boss", role: "admin" }],
    subscriptions: [{ user_id: "u1", tier: "free", status: "none", current_period_end: null }],
    manual_payments: [], payments: [],
  });
  user = { id: "u1" };
});

describe("manual UPI submit", () => {
  it("stores a pending row with SERVER price and unlocks nothing", async () => {
    const { POST } = await import("@/app/api/manual-payment/submit/route");
    const res = await POST(post("http://x", { planId: "starter_monthly", utr: "123456789012" }));
    expect(res.status).toBe(200);
    expect(db.tables.manual_payments[0]).toMatchObject({ amount_paise: 9900, status: "pending" });
    expect(db.tables.subscriptions[0].tier).toBe("free");
  });
  it("rejects client-set amount/status, bad UTR, unknown plan, anonymous", async () => {
    const { POST } = await import("@/app/api/manual-payment/submit/route");
    expect((await POST(post("http://x", { planId: "starter_monthly", utr: "123456789012", amount: 1 }))).status).toBe(400);
    expect((await POST(post("http://x", { planId: "starter_monthly", utr: "123456789012", status: "approved" }))).status).toBe(400);
    expect((await POST(post("http://x", { planId: "starter_monthly", utr: "12ab" }))).status).toBe(400);
    expect((await POST(post("http://x", { planId: "nope", utr: "123456789012" }))).status).toBe(400);
    user = null; expect((await POST(post("http://x", { planId: "starter_monthly", utr: "123456789012" }))).status).toBe(401);
    expect(db.tables.manual_payments).toHaveLength(0);
  });
  it("blocks a reused UTR", async () => {
    const { POST } = await import("@/app/api/manual-payment/submit/route");
    await POST(post("http://x", { planId: "starter_monthly", utr: "111111111111" }));
    expect((await POST(post("http://x", { planId: "starter_monthly", utr: "111111111111" }))).status).toBe(409);
  });
});

describe("admin review", () => {
  const seed = () => db.tables.manual_payments.push({ id: ID, user_id: "u1", plan_id: "starter_monthly", amount_paise: 9900, utr: "222222222222", status: "pending" });
  it("a normal user cannot approve their own payment", async () => {
    seed(); const { POST } = await import("@/app/api/admin/manual-payment/review/route");
    const res = await POST(post("http://x", { id: ID, action: "approve" }));
    expect(res.status).toBe(404); expect(db.tables.subscriptions[0].tier).toBe("free"); expect(db.tables.manual_payments[0].status).toBe("pending");
  });
  it("admin approval grants the plan once; second approval is refused", async () => {
    seed(); user = { id: "boss" }; const { POST } = await import("@/app/api/admin/manual-payment/review/route");
    expect((await POST(post("http://x", { id: ID, action: "approve" }))).status).toBe(200);
    expect(db.tables.subscriptions[0]).toMatchObject({ tier: "starter", status: "active" });
    const end = db.tables.subscriptions[0].current_period_end;
    expect((await POST(post("http://x", { id: ID, action: "approve" }))).status).toBe(409);
    expect(db.tables.subscriptions[0].current_period_end).toBe(end);
    expect(db.tables.payments).toHaveLength(1);
  });
  it("reject grants nothing", async () => {
    seed(); user = { id: "boss" }; const { POST } = await import("@/app/api/admin/manual-payment/review/route");
    await POST(post("http://x", { id: ID, action: "reject" }));
    expect(db.tables.subscriptions[0].tier).toBe("free"); expect(db.tables.manual_payments[0].status).toBe("rejected");
  });
});
