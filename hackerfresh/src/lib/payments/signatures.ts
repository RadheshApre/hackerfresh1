import crypto from "crypto";

function safeEqualHex(a: string, b: string): boolean {
  const A = Buffer.from(a, "utf8"), B = Buffer.from(b, "utf8");
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
const hmac = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

/** One-time Orders: HMAC_SHA256(order_id + "|" + razorpay_payment_id). order_id comes from OUR DB. */
export function verifyOrderSignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return safeEqualHex(hmac(`${orderId}|${paymentId}`, keySecret), signature);
}

/** Subscriptions: HMAC_SHA256(razorpay_payment_id + "|" + subscription_id). Note the reversed order.
 *  subscription_id must come from OUR DB, not from the checkout response (per Razorpay docs). */
export function verifySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string, keySecret: string) {
  if (!subscriptionId || !paymentId || !signature || !keySecret) return false;
  return safeEqualHex(hmac(`${paymentId}|${subscriptionId}`, keySecret), signature);
}

/** Webhooks: HMAC_SHA256 over the RAW request body with the webhook secret; compare to X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, webhookSecret: string | undefined) {
  if (!signature || !webhookSecret) return false; // fail closed
  return safeEqualHex(hmac(rawBody, webhookSecret), signature);
}
