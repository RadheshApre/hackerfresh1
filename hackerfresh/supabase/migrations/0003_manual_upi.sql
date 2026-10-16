-- Manual UPI payments: user submits a UTR, owner verifies against the bank/UPI app statement, then approves.
create table if not exists public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  amount_paise int not null check (amount_paise > 0),   -- copied from SERVER plan config, never from the client
  utr text not null unique check (utr ~ '^[0-9]{12}$'),  -- UPI reference numbers are 12 digits; unique blocks reuse
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists manual_payments_status_idx on public.manual_payments(status, created_at desc);
create index if not exists manual_payments_user_idx on public.manual_payments(user_id, created_at desc);
alter table public.manual_payments enable row level security;
create policy manual_payments_select_own on public.manual_payments for select using (auth.uid() = user_id);
-- no insert/update/delete policies: only server routes (service role) can write.
