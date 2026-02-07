-- User Interactions Table
-- Stores structured + unstructured insights from all user interactions

CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL, -- 'check_in', 'reflection', 'chat', 'feedback'
  
  -- Structured data
  detected_theme TEXT, -- SAFETY, SPARK, POWER, FLOW
  detected_category TEXT, -- BODY, NARRATIVE, ACTION, CONTEXT
  suggested_duration INT,
  user_accepted BOOLEAN,
  
  -- Unstructured data
  raw_transcript TEXT,
  ai_interpretation TEXT,
  extracted_keywords TEXT[],
  
  -- Metadata
  input_method TEXT DEFAULT 'voice', -- 'voice' or 'text'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);

-- RLS Policies
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
