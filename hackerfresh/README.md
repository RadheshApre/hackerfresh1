# HackerFresh — ATS-friendly resume builder with free tries, UPI payments and admin analytics

## Product (current)
- `/` landing page, `/builder` resume builder (3 ATS-friendly single-column templates, live preview, resume checker with job-description keyword match),
  `/dashboard`, `/pricing` (Free + Starter ₹99/month only), `/billing`, draft `/privacy` `/terms` `/refunds` (placeholders: get them reviewed).
- Editing and previewing are free and need no account. **PDF download** needs a free account: 3 free downloads, then Starter (15/month).
- The download document is only returned by `/api/resume/export` after the server consumes one use. Drafts live in the browser (localStorage).
  Honest limit: a determined user could still screenshot or re-create a resume by hand; the gate controls the official PDF export.
- The checker is a documented heuristic (10 checks x 10 points) and is labelled as an estimate, not an official ATS score.


## Payment modes
`PAYMENT_MODE=manual` (default, no Razorpay needed): pricing shows a UPI QR (amount pre-filled from server prices) and your UPI ID.
The customer pays, enters the 12-digit UTR, and it appears in `/admin/payments` as *pending*. You check the UTR **and amount** in your
UPI app / bank statement, then Approve. Only approval unlocks access (period stacks on renewals). Run migrations `0001`, `0002`, `0003`.
Switch later with `PAYMENT_MODE=razorpay` plus the Razorpay env vars; no code changes. `public/upi-qr.jpeg` is your original QR image (fallback).
Limits of manual mode: no automatic confirmation, no AutoPay, refunds are manual. Ask a CA about GST/income-tax treatment of receipts.

## What works now (tested)
- Razorpay **Standard Checkout** (UPI Intent apps / QR shown by Checkout; UPI is listed first).
- **One-time** purchases (Orders API) and **recurring** purchases (Subscriptions API; supports UPI AutoPay).
- Server-side prices only (`src/lib/plans.ts`); the API rejects any client `amount`/`status`.
- Payment signature verification (orders: `order_id|payment_id`; subscriptions: `payment_id|subscription_id`, with the
  subscription id taken from **our DB**, as Razorpay documents). Orders are additionally confirmed against Razorpay's API
  (captured + same amount) before access is granted.
- Webhook (`/api/webhooks/razorpay`): HMAC over the **raw body**, `x-razorpay-event-id` idempotency table, safe retries.
- Access is derived from verified state only (`src/lib/payments/entitlements.ts`). `subscription.authenticated` does **not** grant access;
  `charged`/`activated` do. `halted`, `completed`, refunds revoke. Cancelled keeps access until period end.
- 3 free uses per account (atomic DB function), then paywall; paid plans have explicit monthly caps.
- `/billing` (plan + transaction history), `/billing/status` (DB-truth status page, auto-refreshes while pending).
- **Owner-only `/admin`**: unique visitors (today/7d/30d), page views, sign-ups, tool uses, users out of free tries,
  revenue, active subscribers, failed/refunded, top pages, recent payments. Returns 404 to everyone without `role = 'admin'`.
- 45 automated tests (`npm test`) incl. forged signatures, forged status fields, duplicate webhooks, amount mismatch, refund, expiry.

## Not built yet (from the original spec)
Resume analyzer, interview practice, roadmap, job tracker, public marketing pages, legal pages, onboarding, SEO/blog, support tools.
The `/api/tool/use` gate is ready for those tools to call before doing work. `/refunds` is linked from pricing but the page does not exist yet.

## Setup
1. `npm install`; copy `.env.example` to `.env.local` and fill in values.
2. Supabase: run `supabase/migrations/0001_*.sql` then `0002_*.sql` (SQL editor or `supabase db push`).
   Auth > URL config: set Site URL and add `http://localhost:3000/**` and your production URL to redirect URLs.
3. **Make yourself admin** (only way; there is no UI to self-promote), in the SQL editor after you sign up:
   `update public.profiles set role='admin' where email='you@example.com';`
4. Razorpay (TEST mode): Dashboard > Subscriptions > Plans: create the 3 plans (amounts must equal `plans.ts`) and put their ids in env.
   Dashboard > Webhooks: URL `https://YOUR-HOST/api/webhooks/razorpay`, set a secret = `RAZORPAY_WEBHOOK_SECRET`, tick:
   `payment.captured, payment.failed, refund.processed, subscription.authenticated, subscription.activated, subscription.charged,
   subscription.pending, subscription.halted, subscription.cancelled, subscription.completed, subscription.paused, subscription.resumed`.
   For local testing expose localhost with a tunnel (e.g. ngrok/cloudflared).
5. `npm run dev`, `npm test`, `npm run lint` (type-check).

## UPI notes (from Razorpay docs, checked Oct 2026 — re-verify before launch)
- UPI **collect** (typing a UPI ID) is deprecated by Razorpay; Checkout uses **Intent** (UPI apps) and **QR**. That is why there is no UPI-ID form here.
- Which UPI options appear (QR / apps) is controlled in Dashboard > Payment Configuration. Enable UPI there.
- UPI AutoPay runs through Subscriptions; mandate limits are set by NPCI. Whether UPI AutoPay is enabled for **your** account
  depends on Razorpay's approval; confirm in the Dashboard/with Razorpay support. Test-mode UPI behaviour differs from live.
- Plan changes on UPI mandates are not supported in place: cancel and create a new subscription.

## Going live
Complete Razorpay KYC/activation, generate **Live** keys, create the plans again in live mode, update env (secrets via Secret Manager),
create the live webhook, run one small real payment + refund, then announce. Live-mode UPI AutoPay needs account eligibility.

## Cloud Run
`gcloud run deploy hackerfresh --source . --region asia-south1 --set-secrets=SUPABASE_SERVICE_ROLE_KEY=...:latest,RAZORPAY_KEY_SECRET=...:latest,RAZORPAY_WEBHOOK_SECRET=...:latest --set-env-vars=...`
NEXT_PUBLIC_* are build-time: build with `--build-arg` (Docker) or Cloud Build substitutions.

## Privacy
Analytics store a random cookie id + path only (no IP). Add this to your privacy policy and consider a cookie notice. This is not legal advice.
