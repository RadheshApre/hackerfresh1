import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans";
import { UTR_RE } from "@/lib/manual-upi";

const Body = z.object({ planId: z.string(), utr: z.string().regex(UTR_RE, "UTR must be 12 digits") }).strict(); // no amount/status accepted
const MAX_PENDING = 3;

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid 12-digit UTR" }, { status: 400 });
  const plan = getPlan(parsed.data.planId);
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: pending } = await db.from("manual_payments").select("id").eq("user_id", user.id).eq("status", "pending");
  if ((pending?.length ?? 0) >= MAX_PENDING) return NextResponse.json({ error: "You already have pending submissions. Please wait for review." }, { status: 429 });

  const { error } = await db.from("manual_payments").insert({ user_id: user.id, plan_id: plan.id, amount_paise: plan.amountPaise, utr: parsed.data.utr, status: "pending" });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "This UTR has already been submitted." : "Could not save. Try again." }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ ok: true, status: "pending" }); // NOTHING is unlocked here
}
