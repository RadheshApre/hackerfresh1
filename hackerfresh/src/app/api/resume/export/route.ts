import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consumeToolUse } from "@/lib/usage";
import { exportBody } from "@/lib/resume/schema";
import { exportDocument } from "@/lib/resume/render";

// The printable document is only returned AFTER a server-side quota check consumed one export.
export async function POST(req: Request) {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to download your resume." }, { status: 401 });
  const parsed = exportBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid resume data" }, { status: 400 });
  const r = await consumeToolUse(supabaseAdmin(), user.id, "resume_export");
  if (!r.allowed) return NextResponse.json(r, { status: r.reason === "free_limit_reached" ? 402 : 429 });
  return NextResponse.json({ html: exportDocument(parsed.data.resume, parsed.data.template), remaining: r.remaining });
}
