-- Migration: Insight System + Feedback Storage
-- Created: 2026-01-26

-- ============================================
-- USER INSIGHTS TABLE
-- Stores extracted insights from sessions and manual entries
-- ============================================
CREATE TABLE IF NOT EXISTS user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Content
    text TEXT NOT NULL,
    
    -- Categorization (research-backed)
    category TEXT CHECK (category IN ('BODY', 'NARRATIVE', 'ACTION', 'CONTEXT')),
    theme_relevance TEXT[], -- Array: ['SAFETY', 'SPARK', 'POWER', 'CLARITY', 'FLOW']
    
    -- Source tracking
    source_type TEXT NOT NULL CHECK (source_type IN ('REFLECTION', 'INTENTION', 'MANUAL')),
    source_session_id UUID REFERENCES meditation_history(id) ON DELETE SET NULL,
    
    -- State
    is_active BOOLEAN DEFAULT true, -- Soft delete via toggle
    
    -- Metadata
    keywords TEXT[], -- Extracted keywords for filtering
    extracted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SESSION FEEDBACK TABLE
-- Raw feedback from post-session questions
-- ============================================
CREATE TABLE IF NOT EXISTS session_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meditation_id UUID REFERENCES meditation_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Three Questions (raw text)
    insights_raw TEXT,      -- Q1: What insights arose?
    positives_raw TEXT,     -- Q2: What felt good?
    improvements_raw TEXT,  -- Q3: What could be improved?
    
    -- Extraction tracking
    insights_extracted BOOLEAN DEFAULT false,
    extraction_attempted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- USER PREFERENCES TABLE
-- Stores user settings including voice preference
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Voice
    preferred_voice TEXT DEFAULT 'female' CHECK (preferred_voice IN ('male', 'female')),
    
    -- Last selections (for defaults)
    last_theme TEXT,
    last_duration INTEGER DEFAULT 10,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_insights_user_active ON user_insights(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_insights_theme ON user_insights USING GIN(theme_relevance);
CREATE INDEX IF NOT EXISTS idx_insights_category ON user_insights(category);
CREATE INDEX IF NOT EXISTS idx_feedback_meditation ON session_feedback(meditation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON session_feedback(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own insights
CREATE POLICY "Users can view own insights" ON user_insights
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON user_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON user_insights
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access their own feedback
CREATE POLICY "Users can view own feedback" ON session_feedback
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON session_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON session_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Upsert preferences
-- ============================================
CREATE OR REPLACE FUNCTION upsert_user_preferences(
    p_user_id UUID,
    p_preferred_voice TEXT DEFAULT NULL,
    p_last_theme TEXT DEFAULT NULL,
    p_last_duration INTEGER DEFAULT NULL
)
RETURNS user_preferences AS $$
DECLARE
    result user_preferences;
BEGIN
    INSERT INTO user_preferences (user_id, preferred_voice, last_theme, last_duration)
    VALUES (
        p_user_id,
        COALESCE(p_preferred_voice, 'female'),
        p_last_theme,
        COALESCE(p_last_duration, 10)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        preferred_voice = COALESCE(p_preferred_voice, user_preferences.preferred_voice),
        last_theme = COALESCE(p_last_theme, user_preferences.last_theme),
        last_duration = COALESCE(p_last_duration, user_preferences.last_duration),
        updated_at = now()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
