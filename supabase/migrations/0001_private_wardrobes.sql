-- STYLEWISE private wardrobe foundation
-- Run this once in Supabase SQL Editor after creating your Supabase project.
-- Each signed-in user can access only their own rows and their own image folder.

create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Unsorted'
    check (category in ('Unsorted','Tops','Bottoms','Shoes','Jewellery','Bags','Accessories')),
  color text not null default 'Not set',
  image_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wardrobe_items_user_created_idx
  on public.wardrobe_items (user_id, created_at desc);

alter table public.wardrobe_items enable row level security;

drop policy if exists "Users can read their own wardrobe items" on public.wardrobe_items;
create policy "Users can read their own wardrobe items"
  on public.wardrobe_items for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own wardrobe items" on public.wardrobe_items;
create policy "Users can add their own wardrobe items"
  on public.wardrobe_items for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own wardrobe items" on public.wardrobe_items;
create policy "Users can update their own wardrobe items"
  on public.wardrobe_items for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own wardrobe items" on public.wardrobe_items;
create policy "Users can delete their own wardrobe items"
  on public.wardrobe_items for delete to authenticated
  using (auth.uid() = user_id);

create table if not exists public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.saved_outfits enable row level security;

drop policy if exists "Users can read their own saved outfits" on public.saved_outfits;
create policy "Users can read their own saved outfits"
  on public.saved_outfits for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save their own outfits" on public.saved_outfits;
create policy "Users can save their own outfits"
  on public.saved_outfits for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved outfits" on public.saved_outfits;
create policy "Users can delete their own saved outfits"
  on public.saved_outfits for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stylewise-wardrobe', 'stylewise-wardrobe', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "Users can view their own wardrobe photos" on storage.objects;
create policy "Users can view their own wardrobe photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'stylewise-wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own wardrobe photos" on storage.objects;
create policy "Users can upload their own wardrobe photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'stylewise-wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own wardrobe photos" on storage.objects;
create policy "Users can update their own wardrobe photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'stylewise-wardrobe' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'stylewise-wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own wardrobe photos" on storage.objects;
create policy "Users can delete their own wardrobe photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'stylewise-wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
