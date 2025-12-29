-- Insight App Schema (Supabase)
-- Based on the "Architectural Blueprints for Personalized Generative Meditation"

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  clinical_contraindications TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insights (Journals/Voice Memos)
CREATE TABLE insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT CHECK (type IN ('voice', 'text')),
  timestamp BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parts Ledger (IFS Specific)
CREATE TABLE parts_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('Protector', 'Exile', 'Manager', 'Firefighter')),
  relationship_score INT CHECK (relationship_score BETWEEN 1 AND 10),
  origin_story TEXT,
  somatic_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Somatic Anchors (SE Specific)
CREATE TABLE somatic_anchors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('Visual', 'Auditory', 'Kinesthetic')),
  description TEXT NOT NULL,
  efficacy_rating FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Values Inventory (ACT/WOOP)
CREATE TABLE values_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rank INT,
  definition TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Logs
CREATE TABLE session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  modality TEXT,
  focus TEXT,
  feeling TEXT,
  pre_suds INT CHECK (pre_suds BETWEEN 0 AND 10),
  post_suds INT CHECK (post_suds BETWEEN 0 AND 10),
  delta_suds INT,
  feedback JSONB,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patterns (Identified by AI)
CREATE TABLE patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  observation_count INT DEFAULT 1,
  color TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES (Added Phase 1)

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE somatic_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE values_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Note: Insert is handled by trigger usually, or explicit logic

-- Common Policy Generator (Read/Write Own Data)
CREATE POLICY "Users can view own insights" ON insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON insights FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own parts" ON parts_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own parts" ON parts_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own parts" ON parts_ledger FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own anchors" ON somatic_anchors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own anchors" ON somatic_anchors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own anchors" ON somatic_anchors FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own patterns" ON patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patterns" ON patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patterns" ON patterns FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON session_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON session_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RESOLUTION ENGINE PIVOT TABLES --

-- 1. User Economy (Wallet)
create table if not exists user_economy (
  user_id uuid primary key references auth.users not null,
  balance int default 5, -- Start with 5 tokens
  last_daily_grant date,
  created_at timestamptz default now()
);

-- 2. Resolutions (The Goals)
create table if not exists resolutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  statement text not null, -- "I want to run a marathon"
  root_motivation text, -- "To prove I am strong"
  status text default 'active', -- 'active', 'archived', 'completed'
  created_at timestamptz default now()
);

-- 3. Daily Entries (The Loop)
create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  resolution_id uuid references resolutions not null,
  user_id uuid references auth.users not null, -- Denormalized for easier queries
  date date not null default CURRENT_DATE,
  
  -- Evening Reflection Data
  evening_completed boolean default false,
  reflection_summary text,
  reflection_audio_url text, -- Optional: if we save the Live session audio later
  
  -- Morning Alignment Data
  morning_generated boolean default false,
  morning_meditation_id uuid, -- Link to the generated audio
  
  created_at timestamptz default now(),
  unique(resolution_id, date)
);

-- RLS POLICIES (Simple: Users own their own data)
alter table user_economy enable row level security;
alter table resolutions enable row level security;
alter table daily_entries enable row level security;

create policy "Users can view own economy" on user_economy
  for select using (auth.uid() = user_id);
create policy "Users can update own economy" on user_economy
  for update using (auth.uid() = user_id);
create policy "Users can insert own economy" on user_economy
  for insert with check (auth.uid() = user_id);

create policy "Users can view own resolutions" on resolutions
  for select using (auth.uid() = user_id);
create policy "Users can insert own resolutions" on resolutions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own resolutions" on resolutions
  for update using (auth.uid() = user_id);

create policy "Users can view own entries" on daily_entries
  for select using (auth.uid() = user_id);
create policy "Users can insert own entries" on daily_entries
  for insert with check (auth.uid() = user_id);
create policy "Users can update own entries" on daily_entries
  for update using (auth.uid() = user_id);
