import "server-only";
import { getPlan } from "@/lib/plans";

export type PaymentMode = "manual" | "razorpay";
export const paymentMode = (): PaymentMode => (process.env.PAYMENT_MODE === "razorpay" ? "razorpay" : "manual");

export function upiDetails() {
  return { vpa: process.env.UPI_ID ?? "", payee: process.env.UPI_PAYEE_NAME ?? "HackerFresh" };
}

/** UPI deep link. Amount comes from SERVER plan config. */
export function upiLink(planId: string): string | null {
  const plan = getPlan(planId); const { vpa, payee } = upiDetails();
  if (!plan || !vpa) return null;
  const q = new URLSearchParams({ pa: vpa, pn: payee, am: (plan.amountPaise / 100).toFixed(2), cu: "INR", tn: `HackerFresh ${plan.id}` });
  return `upi://pay?${q.toString()}`;
}

export const UTR_RE = /^[0-9]{12}$/;
