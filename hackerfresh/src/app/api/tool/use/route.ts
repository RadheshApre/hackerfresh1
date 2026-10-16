import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consumeToolUse } from "@/lib/usage";

const Body = z.object({ tool: z.enum(["resume_analyzer", "interview_practice", "roadmap", "resume_export"]) }).strict();

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to use your free tries." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const r = await consumeToolUse(supabaseAdmin(), user.id, parsed.data.tool);
  if (!r.allowed) return NextResponse.json(r, { status: r.reason === "free_limit_reached" ? 402 : 429 });
  return NextResponse.json(r); // the real tool work runs server-side after this check
}
