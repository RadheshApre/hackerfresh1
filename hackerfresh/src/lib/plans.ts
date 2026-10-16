// Single source of truth. Prices are in paise and NEVER read from the client.
export type PlanId = "starter_monthly";
export type Tier = "free" | "starter" | "pro";

export const FREE_LIFETIME_USES = 3; // free tries before payment is required

export interface PaidPlan {
  id: PlanId;
  tier: Exclude<Tier, "free">;
  label: string;
  amountPaise: number;
  periodMonths: 1 | 12;
  monthlyToolUses: number; // explicit fair-use cap, not "unlimited"
  // Razorpay Plan id (plan_xxx) created in the Dashboard/API; set via env.
  razorpayPlanEnv: string;
}

export const PLANS: Record<PlanId, PaidPlan> = {
  starter_monthly: { id: "starter_monthly", tier: "starter", label: "Starter (monthly)", amountPaise: 9900, periodMonths: 1, monthlyToolUses: 15, razorpayPlanEnv: "RAZORPAY_PLAN_STARTER_MONTHLY" },
};

export function getPlan(id: unknown): PaidPlan | null {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id as PlanId] : null;
}
