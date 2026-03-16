-- Migration 002: Signals, Watchlist, Broker Intel, Deal Outcomes, Historical Scans
-- Features #6-#20 database support

-- ═══════════════════════════════════════
-- Vacancy Signals (Feature #6 - Multi-Signal Scoring)
-- ═══════════════════════════════════════
create table if not exists vacancy_signals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  signal_type text not null,
  source text not null,
  description text,
  score integer not null check (score >= 0 and score <= 100),
  raw_data jsonb,
  evidence_url text,
  detected_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_vacancy_signals_property_id on vacancy_signals(property_id);
create index if not exists idx_vacancy_signals_type on vacancy_signals(signal_type);
create index if not exists idx_vacancy_signals_detected on vacancy_signals(detected_at);

-- Composite scores per property
create table if not exists vacancy_scores (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  composite_score integer not null check (composite_score >= 0 and composite_score <= 100),
  confidence text check (confidence in ('high','medium','low')),
  signal_count integer not null,
  predicted_vacant boolean not null default false,
  reasoning text,
  breakdown jsonb,
  computed_at timestamptz default now(),
  unique(property_id)
);

create index if not exists idx_vacancy_scores_score on vacancy_scores(composite_score desc);

-- ═══════════════════════════════════════
-- Watchlist & Change Detection (Feature #7)
-- ═══════════════════════════════════════
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  location text not null,
  location_lat numeric,
  location_lng numeric,
  radius_miles integer default 5,
  property_type text,
  frequency text default 'weekly' check (frequency in ('daily','weekly','biweekly')),
  active boolean default true,
  last_run_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_watchlist_user_id on watchlist(user_id);
create index if not exists idx_watchlist_active on watchlist(active) where active = true;

create table if not exists watchlist_alerts (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references watchlist not null,
  property_id uuid references properties not null,
  alert_type text not null check (alert_type in ('new_vacancy','new_signal','score_change')),
  title text not null,
  description text,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_watchlist_alerts_watchlist on watchlist_alerts(watchlist_id);
create index if not exists idx_watchlist_alerts_unread on watchlist_alerts(read) where read = false;

-- ═══════════════════════════════════════
-- Owner Portfolios (Feature #8)
-- ═══════════════════════════════════════
create table if not exists owner_portfolios (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  owner_entity_id text,
  properties jsonb not null default '[]',
  total_properties integer default 0,
  flagged_count integer default 0,
  last_updated timestamptz default now(),
  unique(owner_name)
);

create index if not exists idx_owner_portfolios_name on owner_portfolios(owner_name);

-- ═══════════════════════════════════════
-- Broker Intel (Feature #18)
-- ═══════════════════════════════════════
create table if not exists broker_intel (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  property_id uuid references properties,
  address text not null,
  city text not null,
  state text not null,
  lat numeric,
  lng numeric,
  intel_type text not null check (intel_type in ('vacant_confirmed','for_sale_rumor','tenant_leaving','construction_stalled','other')),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_broker_intel_user on broker_intel(user_id);
create index if not exists idx_broker_intel_address on broker_intel(address, city, state);

-- ═══════════════════════════════════════
-- Historical Scans (Feature #19)
-- ═══════════════════════════════════════
create table if not exists historical_scans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  composite_score integer not null,
  signal_count integer not null,
  signals_summary text,
  signals_data jsonb,
  scan_date timestamptz default now()
);

create index if not exists idx_historical_scans_property on historical_scans(property_id);
create index if not exists idx_historical_scans_date on historical_scans(scan_date);

-- ═══════════════════════════════════════
-- Deal Outcomes (Feature #20)
-- ═══════════════════════════════════════
create table if not exists deal_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  property_id uuid references properties not null,
  outcome_type text not null check (outcome_type in ('acquired','leased','lost','no_deal','in_progress')),
  deal_value numeric,
  close_date date,
  signals_at_discovery jsonb,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_deal_outcomes_user on deal_outcomes(user_id);
create index if not exists idx_deal_outcomes_property on deal_outcomes(property_id);
create index if not exists idx_deal_outcomes_type on deal_outcomes(outcome_type);

-- ═══════════════════════════════════════
-- Signal Weights (Feature #20 - Learned Weights)
-- ═══════════════════════════════════════
create table if not exists signal_weights (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null unique,
  base_weight numeric not null,
  learned_weight numeric,
  sample_count integer default 0,
  updated_at timestamptz default now()
);

-- Seed default weights
insert into signal_weights (signal_type, base_weight) values
  ('streetview_vision', 0.18),
  ('google_places', 0.14),
  ('tax_delinquency', 0.14),
  ('sos_entity', 0.10),
  ('permit_gap', 0.08),
  ('usps_vacancy', 0.08),
  ('utility_disconnect', 0.06),
  ('code_violation', 0.06),
  ('court_record', 0.04),
  ('broadband_dark', 0.02),
  ('license_expiry', 0.04),
  ('lease_expiration', 0.02),
  ('job_posting', 0.01),
  ('news_closure', 0.01),
  ('broker_intel', 0.02)
on conflict (signal_type) do nothing;

-- ═══════════════════════════════════════
-- Add composite_score column to properties table
-- ═══════════════════════════════════════
alter table properties add column if not exists composite_score integer;
alter table properties add column if not exists last_analyzed_at timestamptz;

-- ═══════════════════════════════════════
-- RLS Policies for new tables
-- ═══════════════════════════════════════

alter table vacancy_signals enable row level security;
alter table vacancy_scores enable row level security;
alter table watchlist enable row level security;
alter table watchlist_alerts enable row level security;
alter table owner_portfolios enable row level security;
alter table broker_intel enable row level security;
alter table historical_scans enable row level security;
alter table deal_outcomes enable row level security;
alter table signal_weights enable row level security;

-- Vacancy signals: readable by authenticated users
create policy "Authenticated can read vacancy signals" on vacancy_signals
  for select using (auth.role() = 'authenticated');

-- Vacancy scores: readable by authenticated users
create policy "Authenticated can read vacancy scores" on vacancy_scores
  for select using (auth.role() = 'authenticated');

-- Watchlist: users manage their own
create policy "Users manage own watchlist" on watchlist
  for all using (auth.uid() = user_id);

-- Watchlist alerts: users see alerts for their watchlists
create policy "Users see own watchlist alerts" on watchlist_alerts
  for select using (
    exists (select 1 from watchlist where watchlist.id = watchlist_alerts.watchlist_id and watchlist.user_id = auth.uid())
  );
create policy "Users update own watchlist alerts" on watchlist_alerts
  for update using (
    exists (select 1 from watchlist where watchlist.id = watchlist_alerts.watchlist_id and watchlist.user_id = auth.uid())
  );

-- Owner portfolios: readable by authenticated users
create policy "Authenticated can read owner portfolios" on owner_portfolios
  for select using (auth.role() = 'authenticated');

-- Broker intel: users manage their own, can read all
create policy "Users insert own broker intel" on broker_intel
  for insert with check (auth.uid() = user_id);
create policy "Authenticated can read broker intel" on broker_intel
  for select using (auth.role() = 'authenticated');

-- Historical scans: readable by authenticated users
create policy "Authenticated can read historical scans" on historical_scans
  for select using (auth.role() = 'authenticated');

-- Deal outcomes: users manage their own
create policy "Users manage own deal outcomes" on deal_outcomes
  for all using (auth.uid() = user_id);

-- Signal weights: readable by all, writable by service role only
create policy "Authenticated can read signal weights" on signal_weights
  for select using (auth.role() = 'authenticated');
