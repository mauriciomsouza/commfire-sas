-- Commfire SAS – storage bucket for floor plan images
-- Migration: 004_storage_floor_plans

-- ─── Storage bucket ───────────────────────────────────────────────────────────
-- Public bucket so floor plan images can be served directly via public URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'floor-plans',
  'floor-plans',
  true,
  20971520, -- 20 MB limit
  array[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

-- ─── Storage policies ─────────────────────────────────────────────────────────
-- Authenticated users can upload floor plans (insert).
create policy "authenticated users can upload floor plans"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'floor-plans');

-- Authenticated users can update their floor plan files.
create policy "authenticated users can update floor plans"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'floor-plans');

-- Authenticated users can delete floor plan files.
create policy "authenticated users can delete floor plans"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'floor-plans');

-- Public read access (bucket is public, but an explicit select policy is needed).
create policy "public can view floor plans"
  on storage.objects for select
  to public
  using (bucket_id = 'floor-plans');
