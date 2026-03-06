-- Commfire SAS – initial database schema
-- Migration: 001_initial_schema

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type account_role as enum ('platform_admin', 'customer');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete');
create type gateway_status as enum ('online', 'offline', 'degraded');
create type detector_type as enum ('smoke', 'heat', 'co', 'multi');
create type detector_status as enum ('normal', 'alarm', 'fault', 'offline', 'tamper');
create type battery_level as enum ('critical', 'low', 'medium', 'good', 'full');
create type event_type as enum ('alarm', 'alarm_clear', 'fault', 'fault_clear', 'tamper', 'tamper_clear', 'low_battery', 'heartbeat', 'join', 'leave');

-- ─── User profiles ────────────────────────────────────────────────────────────
create table public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        account_role not null default 'customer',
  customer_id uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Customers (organisations) ────────────────────────────────────────────────
create table public.customers (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  slug                text not null unique,
  logo_url            text,
  stripe_customer_id  text unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.user_profiles
  add constraint user_profiles_customer_fk
  foreign key (customer_id) references public.customers(id) on delete set null;

-- ─── Buildings ────────────────────────────────────────────────────────────────
create table public.buildings (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name        text not null,
  address     text not null default '',
  city        text not null default '',
  country     text not null default '',
  postal_code text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Subscriptions ────────────────────────────────────────────────────────────
create table public.subscriptions (
  id                      uuid primary key default uuid_generate_v4(),
  customer_id             uuid not null references public.customers(id) on delete cascade,
  building_id             uuid not null references public.buildings(id) on delete cascade,
  stripe_subscription_id  text not null unique,
  status                  subscription_status not null default 'trialing',
  plan_id                 text not null,
  current_period_start    timestamptz not null default now(),
  current_period_end      timestamptz not null default now() + interval '30 days',
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ─── Floors ───────────────────────────────────────────────────────────────────
create table public.floors (
  id               uuid primary key default uuid_generate_v4(),
  building_id      uuid not null references public.buildings(id) on delete cascade,
  name             text not null,
  level            integer not null default 0,
  floor_plan_url   text,
  floor_plan_width  integer,
  floor_plan_height integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Gateways ─────────────────────────────────────────────────────────────────
create table public.gateways (
  id           uuid primary key default uuid_generate_v4(),
  building_id  uuid not null references public.buildings(id) on delete cascade,
  floor_id     uuid references public.floors(id) on delete set null,
  eui          text not null unique,
  name         text not null,
  status       gateway_status not null default 'offline',
  firmware     text not null default '',
  last_seen_at timestamptz,
  pos_x        real,
  pos_y        real,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Detectors ────────────────────────────────────────────────────────────────
create table public.detectors (
  id              uuid primary key default uuid_generate_v4(),
  gateway_id      uuid not null references public.gateways(id) on delete cascade,
  floor_id        uuid references public.floors(id) on delete set null,
  eui             text not null unique,
  name            text not null,
  type            detector_type not null default 'smoke',
  status          detector_status not null default 'normal',
  battery_voltage real,
  battery_level   battery_level,
  rssi            integer,
  snr             integer,
  last_seen_at    timestamptz,
  pos_x           real,
  pos_y           real,
  parent_eui      text,
  hop_count       integer not null default 0,
  mesh_depth      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Mesh links ───────────────────────────────────────────────────────────────
create table public.mesh_links (
  id          uuid primary key default uuid_generate_v4(),
  source_eui  text not null,
  target_eui  text not null,
  rssi        integer not null,
  snr         integer not null,
  updated_at  timestamptz not null default now(),
  unique (source_eui, target_eui)
);

-- ─── Device events ────────────────────────────────────────────────────────────
create table public.device_events (
  id           uuid primary key default uuid_generate_v4(),
  detector_id  uuid references public.detectors(id) on delete set null,
  gateway_id   uuid references public.gateways(id) on delete set null,
  type         event_type not null,
  payload      jsonb not null default '{}',
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

create index device_events_detector_id_idx on public.device_events (detector_id, received_at desc);
create index device_events_gateway_id_idx on public.device_events (gateway_id, received_at desc);
create index device_events_type_idx on public.device_events (type, received_at desc);

-- ─── Updated-at triggers ──────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.user_profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.buildings
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.floors
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.gateways
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.detectors
  for each row execute function public.handle_updated_at();

-- ─── Auto-create user profile on signup ───────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  _customer_id uuid;
  _org_name    text;
  _slug        text;
begin
  _org_name := coalesce(new.raw_user_meta_data->>'org_name', split_part(new.email, '@', 2));
  _slug     := regexp_replace(lower(_org_name), '[^a-z0-9]+', '-', 'g');

  -- create customer record
  insert into public.customers (name, slug)
  values (_org_name, _slug || '-' || substr(new.id::text, 1, 8))
  returning id into _customer_id;

  -- create profile
  insert into public.user_profiles (id, email, full_name, role, customer_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer',
    _customer_id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row Level Security ───────────────────────────────────────────────────────

-- Helper: get the current user's profile row
create or replace function public.current_user_profile()
returns public.user_profiles language sql security definer stable as $$
  select * from public.user_profiles where id = auth.uid() limit 1;
$$;

-- Helper: is the current user a platform admin?
create or replace function public.is_platform_admin()
returns boolean language sql security definer stable as $$
  select role = 'platform_admin' from public.user_profiles where id = auth.uid();
$$;

-- Helper: get the current user's customer_id
create or replace function public.current_customer_id()
returns uuid language sql security definer stable as $$
  select customer_id from public.user_profiles where id = auth.uid();
$$;

-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.buildings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.floors enable row level security;
alter table public.gateways enable row level security;
alter table public.detectors enable row level security;
alter table public.mesh_links enable row level security;
alter table public.device_events enable row level security;

-- user_profiles: users see their own; admins see all
create policy "users can view own profile" on public.user_profiles
  for select using (id = auth.uid() or public.is_platform_admin());
create policy "users can update own profile" on public.user_profiles
  for update using (id = auth.uid());

-- customers
create policy "customer members can view their customer" on public.customers
  for select using (id = public.current_customer_id() or public.is_platform_admin());
create policy "customer members can update their customer" on public.customers
  for update using (id = public.current_customer_id() or public.is_platform_admin());

-- buildings: scoped to customer
create policy "customer can view own buildings" on public.buildings
  for select using (customer_id = public.current_customer_id() or public.is_platform_admin());
create policy "customer can insert buildings" on public.buildings
  for insert with check (customer_id = public.current_customer_id() or public.is_platform_admin());
create policy "customer can update buildings" on public.buildings
  for update using (customer_id = public.current_customer_id() or public.is_platform_admin());
create policy "customer can delete buildings" on public.buildings
  for delete using (customer_id = public.current_customer_id() or public.is_platform_admin());

-- subscriptions
create policy "customer can view own subscriptions" on public.subscriptions
  for select using (customer_id = public.current_customer_id() or public.is_platform_admin());

-- floors: scoped through building
create policy "customer can manage floors" on public.floors
  for all using (
    building_id in (select id from public.buildings where customer_id = public.current_customer_id())
    or public.is_platform_admin()
  );

-- gateways: scoped through building
create policy "customer can manage gateways" on public.gateways
  for all using (
    building_id in (select id from public.buildings where customer_id = public.current_customer_id())
    or public.is_platform_admin()
  );

-- detectors: scoped through gateway
create policy "customer can manage detectors" on public.detectors
  for all using (
    gateway_id in (
      select g.id from public.gateways g
      join public.buildings b on b.id = g.building_id
      where b.customer_id = public.current_customer_id()
    )
    or public.is_platform_admin()
  );

-- mesh_links: open for authenticated
create policy "authenticated users can view mesh_links" on public.mesh_links
  for select using (auth.uid() is not null);

-- device_events: scoped through gateway
create policy "customer can view own events" on public.device_events
  for select using (
    gateway_id in (
      select g.id from public.gateways g
      join public.buildings b on b.id = g.building_id
      where b.customer_id = public.current_customer_id()
    )
    or public.is_platform_admin()
  );
