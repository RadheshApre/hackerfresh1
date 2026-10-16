import "server-only";
import { FREE_LIFETIME_USES } from "@/lib/plans";
import { effectiveTier, monthlyCap, type SubRow } from "@/lib/payments/entitlements";

type Admin = ReturnType<typeof import("@/lib/supabase/admin").supabaseAdmin>;
export type UseResult =
  | { allowed: true; tier: string; remaining: number | null }
  | { allowed: false; reason: "free_limit_reached" | "monthly_limit_reached"; upgrade: boolean };

/** Server-side gate. Entitlement comes from the DB only; nothing from the browser can raise it. */
export async function consumeToolUse(db: Admin, userId: string, tool: string, now = new Date()): Promise<UseResult> {
  const { data: sub } = await db.from("subscriptions").select("tier,plan_id,status,current_period_end,cancel_at_period_end").eq("user_id", userId).maybeSingle();
  const row = (sub ?? null) as SubRow | null;
  const tier = effectiveTier(row, now);

  if (tier === "free") {
    const { data: ok } = await db.rpc("consume_free_use", { p_user: userId, p_limit: FREE_LIFETIME_USES }); // atomic
    if (!ok) return { allowed: false, reason: "free_limit_reached", upgrade: true };
    await db.from("usage_records").insert({ user_id: userId, tool, period: now.toISOString().slice(0, 7) });
    const { data: prof } = await db.from("profiles").select("free_uses_consumed").eq("id", userId).single();
    return { allowed: true, tier, remaining: FREE_LIFETIME_USES - (prof?.free_uses_consumed ?? FREE_LIFETIME_USES) };
  }

  const period = now.toISOString().slice(0, 7);
  const cap = monthlyCap(row, now);
  const { count } = await db.from("usage_records").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("period", period);
  if ((count ?? 0) >= cap) return { allowed: false, reason: "monthly_limit_reached", upgrade: tier !== "pro" };
  await db.from("usage_records").insert({ user_id: userId, tool, period });
  return { allowed: true, tier, remaining: cap - (count ?? 0) - 1 };
}
