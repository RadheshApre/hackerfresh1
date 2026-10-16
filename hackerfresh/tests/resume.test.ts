import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeDb } from "./fakeDb";
import { analyze } from "@/lib/resume/ats";
import { renderResumeHtml, exportDocument } from "@/lib/resume/render";
import { SAMPLE_RESUME } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/types";

describe("ATS checker (heuristic estimate)", () => {
  it("scores an empty resume low and the sample resume higher", () => {
    expect(analyze(emptyResume()).score).toBeLessThanOrEqual(10);
    expect(analyze(SAMPLE_RESUME).score).toBeGreaterThan(analyze(emptyResume()).score + 50);
  });
  it("reports missing job-description keywords without inventing matches", () => {
    const r = analyze(SAMPLE_RESUME, "We need Kubernetes, Terraform and Python experience. Kubernetes Terraform Python required.");
    expect(r.missing).toEqual(expect.arrayContaining(["kubernetes", "terraform"])); expect(r.matched).toContain("python");
    expect(r.keywordMatch).toBeGreaterThan(0); expect(r.keywordMatch).toBeLessThan(100);
  });
  it("no keyword result without a job description", () => expect(analyze(SAMPLE_RESUME).keywordMatch).toBeNull());
});

describe("renderer", () => {
  it("escapes HTML so user input cannot inject scripts", () => {
    const d = { ...emptyResume(), name: '<script>alert(1)</script>', summary: '"><img src=x onerror=alert(1)>' };
    const html = renderResumeHtml(d, "classic");
    expect(html).not.toContain("<script>"); expect(html).not.toContain("<img"); expect(html).toContain("&lt;script&gt;");
  });
  it("uses ATS-safe structure: no tables or images", () => {
    for (const t of ["classic", "modern", "compact"] as const) { const h = renderResumeHtml(SAMPLE_RESUME, t); expect(h).not.toMatch(/<table|<img|<svg/); expect(h).toContain("<h2>Experience</h2>"); }
  });
  it("export document is a full printable page", () => expect(exportDocument(SAMPLE_RESUME, "modern")).toContain("window.print"));
});

let db: any; let user: { id: string } | null;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => db }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }));
const call = async (body: unknown) => (await import("@/app/api/resume/export/route")).POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

describe("export route is gated on the server", () => {
  beforeEach(() => {
    db = fakeDb({ profiles: [{ id: "u1", free_uses_consumed: 0 }], subscriptions: [{ user_id: "u1", tier: "free", status: "none", current_period_end: null }], usage_records: [] },
      { consume_free_use: ({ p_user, p_limit }) => { const p = db.tables.profiles.find((r: any) => r.id === p_user); if (p.free_uses_consumed < p_limit) { p.free_uses_consumed++; return true; } return false; } });
    user = { id: "u1" };
  });
  const body = { resume: SAMPLE_RESUME, template: "classic" };
  it("requires sign-in", async () => { user = null; expect((await call(body)).status).toBe(401); });
  it("gives 3 free exports then returns 402 with no document", async () => {
    for (let i = 0; i < 3; i++) { const r = await call(body); expect(r.status).toBe(200); expect((await r.json()).html).toContain("Aarav Sharma"); }
    const blocked = await call(body); expect(blocked.status).toBe(402); expect(JSON.stringify(await blocked.json())).not.toContain("<html");
  });
  it("paid plan unlocks more, after server-side verification only", async () => {
    for (let i = 0; i < 3; i++) await call(body);
    Object.assign(db.tables.subscriptions[0], { tier: "starter", plan_id: "starter_monthly", status: "active", current_period_end: new Date(Date.now() + 864e6).toISOString() });
    expect((await call(body)).status).toBe(200);
  });
  it("rejects unknown fields and oversized input", async () => {
    expect((await call({ ...body, tier: "pro" })).status).toBe(400);
    expect((await call({ resume: { ...SAMPLE_RESUME, summary: "x".repeat(5000) }, template: "classic" })).status).toBe(400);
  });
});
