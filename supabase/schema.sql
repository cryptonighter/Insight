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
