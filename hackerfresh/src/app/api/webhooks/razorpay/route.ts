import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/payments/signatures";
import { handleWebhook } from "@/lib/payments/fulfil";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text(); // RAW body: must not be parsed/re-serialised before verification
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"), process.env.RAZORPAY_WEBHOOK_SECRET))
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  let evt: { event: string; payload: any };
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const eventId = req.headers.get("x-razorpay-event-id");
  if (!eventId) return NextResponse.json({ error: "missing event id" }, { status: 400 });

  const db = supabaseAdmin();
  const { error: dupe } = await db.from("webhook_events").insert({ event_id: eventId, event_type: evt.event });
  if (dupe) { // unique violation => already processed: acknowledge so Razorpay stops retrying
    if (dupe.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: "storage error" }, { status: 500 });
  }
  try {
    await handleWebhook(db, evt);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await db.from("webhook_events").delete().eq("event_id", eventId); // allow Razorpay's retry to reprocess
    console.error("webhook failed", evt.event, (e as Error).message);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
