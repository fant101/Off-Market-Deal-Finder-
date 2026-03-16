-- Vacancy Finder Database Schema
-- Run this in the Supabase SQL editor to set up the database

-- Searches table
create table if not exists searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  location_input text not null,
  location_lat numeric,
  location_lng numeric,
  property_type text,
  radius_miles integer,
  strategies text[] not null,
  result_count integer,
  created_at timestamptz default now()
);

-- Properties table (deduplicated across all searches)
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  city text,
  state text,
  zip text,
  lat numeric,
  lng numeric,
  property_type text,
  estimated_sf text,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique(address, city, state)
);

-- Search Results (junction table)
create table if not exists search_results (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references searches not null,
  property_id uuid references properties not null,
  vacancy_signal text,
  signal_source text,
  time_vacant text,
  owner_name text,
  owner_type text,
  confidence text check (confidence in ('high','medium','low')),
  details text,
  strategy text,
  created_at timestamptz default now()
);

-- Saved Properties (broker's personal list)
create table if not exists saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  property_id uuid references properties not null,
  notes text,
  status text default 'new' check (status in ('new','contacted','in_conversation','dead')),
  saved_at timestamptz default now(),
  unique(user_id, property_id)
);

-- Skipped Properties
create table if not exists skipped_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  property_id uuid references properties not null,
  skipped_at timestamptz default now(),
  unique(user_id, property_id)
);

-- Enable Row Level Security
alter table searches enable row level security;
alter table properties enable row level security;
alter table search_results enable row level security;
alter table saved_properties enable row level security;
alter table skipped_properties enable row level security;

-- RLS Policies

-- Searches: users can only see their own
create policy "Users can view own searches" on searches
  for select using (auth.uid() = user_id);
create policy "Users can insert own searches" on searches
  for insert with check (auth.uid() = user_id);

-- Properties: readable by all authenticated users, writable via service role
create policy "Authenticated users can read properties" on properties
  for select using (auth.role() = 'authenticated');

-- Search Results: users can see results from their searches
create policy "Users can view results from own searches" on search_results
  for select using (
    exists (
      select 1 from searches where searches.id = search_results.search_id and searches.user_id = auth.uid()
    )
  );

-- Saved Properties: users can only manage their own
create policy "Users can view own saved" on saved_properties
  for select using (auth.uid() = user_id);
create policy "Users can insert own saved" on saved_properties
  for insert with check (auth.uid() = user_id);
create policy "Users can update own saved" on saved_properties
  for update using (auth.uid() = user_id);
create policy "Users can delete own saved" on saved_properties
  for delete using (auth.uid() = user_id);

-- Skipped Properties: users can only manage their own
create policy "Users can view own skipped" on skipped_properties
  for select using (auth.uid() = user_id);
create policy "Users can insert own skipped" on skipped_properties
  for insert with check (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_searches_user_id on searches(user_id);
create index if not exists idx_search_results_search_id on search_results(search_id);
create index if not exists idx_search_results_property_id on search_results(property_id);
create index if not exists idx_saved_properties_user_id on saved_properties(user_id);
create index if not exists idx_skipped_properties_user_id on skipped_properties(user_id);
create index if not exists idx_properties_address on properties(address, city, state);
