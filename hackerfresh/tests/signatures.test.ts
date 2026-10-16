import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyOrderSignature, verifySubscriptionSignature, verifyWebhookSignature } from "@/lib/payments/signatures";

const h = (s: string, k: string) => crypto.createHmac("sha256", k).update(s).digest("hex");
const KEY = "test_key_secret", WH = "whsec_test";

describe("checkout signatures", () => {
  it("accepts a valid order signature (order_id|payment_id)", () => {
    expect(verifyOrderSignature("order_1", "pay_1", h("order_1|pay_1", KEY), KEY)).toBe(true);
  });
  it("rejects forged / tampered order signatures", () => {
    expect(verifyOrderSignature("order_1", "pay_1", "deadbeef", KEY)).toBe(false);
    expect(verifyOrderSignature("order_1", "pay_2", h("order_1|pay_1", KEY), KEY)).toBe(false);
    expect(verifyOrderSignature("order_1", "pay_1", h("order_1|pay_1", "wrong_secret"), KEY)).toBe(false);
  });
  it("subscription signature uses payment_id|subscription_id (reversed order)", () => {
    expect(verifySubscriptionSignature("pay_1", "sub_1", h("pay_1|sub_1", KEY), KEY)).toBe(true);
    expect(verifySubscriptionSignature("pay_1", "sub_1", h("sub_1|pay_1", KEY), KEY)).toBe(false);
  });
  it("rejects empty inputs", () => {
    expect(verifyOrderSignature("", "p", "s", KEY)).toBe(false);
    expect(verifySubscriptionSignature("p", "s", "", KEY)).toBe(false);
  });
});

describe("webhook signature (raw body)", () => {
  const body = '{"event":"payment.captured","payload":{}}';
  it("accepts correct signature", () => expect(verifyWebhookSignature(body, h(body, WH), WH)).toBe(true));
  it("rejects a modified body (even whitespace changes)", () => {
    expect(verifyWebhookSignature(body + " ", h(body, WH), WH)).toBe(false);
    expect(verifyWebhookSignature(JSON.stringify(JSON.parse(body), null, 2), h(body, WH), WH)).toBe(false);
  });
  it("fails closed when secret or header is missing", () => {
    expect(verifyWebhookSignature(body, h(body, WH), undefined)).toBe(false);
    expect(verifyWebhookSignature(body, null, WH)).toBe(false);
  });
});
