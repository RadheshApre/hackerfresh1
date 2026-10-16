import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const Body = z.object({ path: z.string().min(1).max(200).startsWith("/") }).strict();
const BOT = /bot|crawl|spider|slurp|preview|monitor|headless/i;
const seen = new Map<string, number>(); // best-effort in-memory throttle (per instance)

export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return NextResponse.json({ ok: true });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const store = await cookies();
  let vid = store.get("hf_vid")?.value;
  const fresh = !vid;
  if (!vid) vid = crypto.randomUUID(); // random id only: no IP, no fingerprinting

  const last = seen.get(vid) ?? 0;
  if (Date.now() - last < 1000) return NextResponse.json({ ok: true });
  seen.set(vid, Date.now());
  if (seen.size > 5000) seen.clear();

  let userId: string | null = null;
  try { userId = (await (await supabaseServer()).auth.getUser()).data.user?.id ?? null; } catch {}
  await supabaseAdmin().from("page_views").insert({ visitor_id: vid, path: parsed.data.path, user_id: userId });

  const res = NextResponse.json({ ok: true });
  if (fresh) res.cookies.set("hf_vid", vid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}
