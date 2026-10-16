-- HackerFresh: payments, entitlements, usage quota, analytics.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  free_uses_consumed int not null default 0 check (free_uses_consumed >= 0),
  created_at timestamptz not null default now()
);

-- One row per user: the entitlement. Written ONLY by the service role (webhook/verify routes).
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','starter','pro')),
  plan_id text,
  status text not null default 'none' check (status in ('none','created','pending_payment','active','pending','halted','cancelled','expired','refunded','failed')),
  razorpay_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Transaction history shown to the user. Written ONLY by the service role.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  kind text not null check (kind in ('one_time','subscription')),
  amount_paise int not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','pending','paid','failed','cancelled','refunded','expired')),
  razorpay_order_id text unique,
  razorpay_subscription_id text,
  razorpay_payment_id text unique,
  method text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id, created_at desc);
create index if not exists payments_sub_idx on public.payments(razorpay_subscription_id);

-- Idempotency: Razorpay sends x-razorpay-event-id; primary key makes duplicates a no-op.
create table if not exists public.webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.usage_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  period text not null,             -- 'YYYY-MM' for paid quotas
  created_at timestamptz not null default now()
);
create index if not exists usage_user_period_idx on public.usage_records(user_id, period);

-- Privacy-conscious analytics: no IPs, no raw user agents. Visitor id is a random cookie.
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  path text not null check (length(path) <= 200),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on public.page_views(created_at desc);

-- Atomic free-use consumption: prevents two parallel requests from both squeezing past the limit.
create or replace function public.consume_free_use(p_user uuid, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update profiles set free_uses_consumed = free_uses_consumed + 1
   where id = p_user and free_uses_consumed < p_limit
  returning true into ok;
  return coalesce(ok, false);
end $$;
revoke all on function public.consume_free_use(uuid,int) from public, anon, authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.usage_records enable row level security;
alter table public.page_views enable row level security;

-- Users may READ their own rows. No insert/update/delete policies => writes are service-role only.
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy subscriptions_select_own on public.subscriptions for select using (auth.uid() = user_id);
create policy payments_select_own on public.payments for select using (auth.uid() = user_id);
create policy usage_select_own on public.usage_records for select using (auth.uid() = user_id);
-- webhook_events and page_views: no policies at all => inaccessible to anon/authenticated.

-- Prevent privilege escalation: users can't update their own profile (role / free_uses_consumed).
-- (No update policy exists. If you later add profile editing, restrict columns via a view or RPC.)

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email) values (new.id, new.email) on conflict do nothing;
  insert into public.subscriptions(user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
