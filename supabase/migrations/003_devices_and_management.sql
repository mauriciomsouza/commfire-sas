-- Commfire SAS – devices serial numbers, virtual devices, alarms, payment settlements
-- Migration: 003_devices_and_management

-- ─── Serial numbers & virtual flag for gateways ───────────────────────────────
alter table public.gateways
  add column if not exists serial_number text unique,
  add column if not exists is_virtual    boolean not null default false;

create index if not exists gateways_serial_number_idx on public.gateways (serial_number);

-- ─── Serial numbers & virtual flag for detectors ─────────────────────────────
alter table public.detectors
  add column if not exists serial_number text unique,
  add column if not exists is_virtual    boolean not null default false;

create index if not exists detectors_serial_number_idx on public.detectors (serial_number);

-- ─── Hardware alarms ─────────────────────────────────────────────────────────
-- Physical alarm/siren units installed in buildings (separate from alarm events)
create table if not exists public.alarms (
  id            uuid primary key default uuid_generate_v4(),
  building_id   uuid not null references public.buildings(id) on delete cascade,
  floor_id      uuid references public.floors(id) on delete set null,
  gateway_id    uuid references public.gateways(id) on delete set null,
  serial_number text unique,
  name          text not null,
  is_virtual    boolean not null default false,
  status        text not null default 'normal'
                check (status in ('normal', 'triggered', 'fault', 'offline')),
  pos_x         real,
  pos_y         real,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger set_updated_at before update on public.alarms
  for each row execute function public.handle_updated_at();

create index alarms_building_id_idx on public.alarms (building_id);
create index alarms_serial_number_idx on public.alarms (serial_number);

-- ─── Payment settlements ─────────────────────────────────────────────────────
-- Manual payment records for transactions outside Stripe automatic billing
create table if not exists public.payment_settlements (
  id              uuid primary key default uuid_generate_v4(),
  customer_id     uuid not null references public.customers(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount          numeric(10, 2) not null check (amount > 0),
  currency        text not null default 'BRL',
  method          text not null default 'manual'
                  check (method in ('manual', 'pix', 'boleto', 'bank_transfer', 'cash', 'other')),
  reference       text,
  notes           text,
  settled_by      uuid references auth.users(id) on delete set null,
  settled_at      timestamptz not null default now(),
  period_start    timestamptz,
  period_end      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger set_updated_at before update on public.payment_settlements
  for each row execute function public.handle_updated_at();

create index payment_settlements_customer_id_idx on public.payment_settlements (customer_id);
create index payment_settlements_settled_at_idx on public.payment_settlements (settled_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.alarms enable row level security;
alter table public.payment_settlements enable row level security;

-- alarms: scoped through building
create policy "customer can manage alarms" on public.alarms
  for all using (
    building_id in (
      select id from public.buildings where customer_id = public.current_customer_id()
    )
    or public.is_platform_admin()
  );

-- payment_settlements: admin only
create policy "admin can manage settlements" on public.payment_settlements
  for all using (public.is_platform_admin());

create policy "customer can view own settlements" on public.payment_settlements
  for select using (customer_id = public.current_customer_id() or public.is_platform_admin());
