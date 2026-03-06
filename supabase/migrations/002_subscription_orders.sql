-- Commfire SAS – subscription orders (pre-installation tracking)
-- Migration: 002_subscription_orders

-- ─── Subscription orders ─────────────────────────────────────────────────────
-- Tracks device quantities selected during onboarding before Stripe billing.
create table public.subscription_orders (
  id              uuid primary key default uuid_generate_v4(),
  customer_id     uuid not null references public.customers(id) on delete cascade,
  detectors_qty   integer not null default 0 check (detectors_qty >= 0),
  alarms_qty      integer not null default 0 check (alarms_qty >= 0),
  gateways_qty    integer not null default 0 check (gateways_qty >= 0),
  monthly_total   numeric(10, 2) not null default 0,
  status          text not null default 'pending_installation'
                  check (status in ('pending_installation', 'scheduled', 'installed', 'canceled')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger set_updated_at before update on public.subscription_orders
  for each row execute function public.handle_updated_at();

create index subscription_orders_customer_id_idx on public.subscription_orders (customer_id);
create index subscription_orders_status_idx on public.subscription_orders (status);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.subscription_orders enable row level security;

create policy "customer can view own orders" on public.subscription_orders
  for select using (customer_id = public.current_customer_id() or public.is_platform_admin());

create policy "customer can insert own orders" on public.subscription_orders
  for insert with check (customer_id = public.current_customer_id() or public.is_platform_admin());

create policy "admin can update orders" on public.subscription_orders
  for update using (public.is_platform_admin());
