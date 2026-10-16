-- Aggregate stats for the admin dashboard. Callable ONLY with the service role (server-side, after a role check).
create or replace function public.admin_stats() returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'visitors_today',  (select count(distinct visitor_id) from page_views where created_at >= date_trunc('day', now())),
    'visitors_7d',     (select count(distinct visitor_id) from page_views where created_at >= now() - interval '7 days'),
    'visitors_30d',    (select count(distinct visitor_id) from page_views where created_at >= now() - interval '30 days'),
    'page_views_7d',   (select count(*) from page_views where created_at >= now() - interval '7 days'),
    'signups_total',   (select count(*) from profiles),
    'signups_7d',      (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'tool_uses_7d',    (select count(*) from usage_records where created_at >= now() - interval '7 days'),
    'free_uses_total', (select coalesce(sum(free_uses_consumed),0) from profiles),
    'users_out_of_free', (select count(*) from profiles where free_uses_consumed >= 3),
    'paid_payments',   (select count(*) from payments where status = 'paid'),
    'revenue_paise',   (select coalesce(sum(amount_paise),0) from payments where status = 'paid'),
    'refunded_payments', (select count(*) from payments where status = 'refunded'),
    'failed_payments', (select count(*) from payments where status = 'failed'),
    'active_subscribers', (select count(*) from subscriptions where status = 'active'),
    'top_pages_7d', (select coalesce(json_agg(t), '[]'::json) from (
        select path, count(*) as views from page_views where created_at >= now() - interval '7 days'
        group by path order by views desc limit 8) t)
  );
$$;
revoke all on function public.admin_stats() from public, anon, authenticated;
