-- Commfire SAS – simulation events table
-- Migration: 005_sim_events

-- ─── Simulation events ────────────────────────────────────────────────────────
-- Commands inserted by platform admins via the superadmin simulation panel.
-- The sim-server polls this table, processes each pending event, and marks it done.
create table if not exists public.sim_events (
  id            uuid primary key default uuid_generate_v4(),
  device_type   text not null check (device_type in ('gateway', 'detector', 'alarm')),
  device_id     uuid not null,
  device_eui    text,
  event_type    text not null check (event_type in (
    'heartbeat', 'alarm', 'alarm_clear', 'fault', 'fault_clear',
    'tamper', 'tamper_clear', 'low_battery', 'join'
  )),
  payload       jsonb not null default '{}',
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'done', 'error')),
  error_message text,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz
);

create index sim_events_status_idx on public.sim_events (status, created_at desc);
create index sim_events_device_id_idx on public.sim_events (device_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.sim_events enable row level security;

create policy "platform_admin can manage sim_events"
  on public.sim_events
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
