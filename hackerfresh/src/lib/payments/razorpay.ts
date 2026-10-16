import "server-only";
import Razorpay from "razorpay";
import { required } from "@/lib/env";

export function razorpayClient() {
  return new Razorpay({ key_id: required("RAZORPAY_KEY_ID"), key_secret: required("RAZORPAY_KEY_SECRET") });
}
