-- ============================================================================
-- Migration: Sonic Director & User Preferences
-- Created: 2026-01-24
-- Description: Adds clinical_protocols table and user sonic preferences support
-- ============================================================================

-- 1. PROFILES SETTINGS COLUMN
-- Stores user preferences including sonic settings
-- ============================================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

COMMENT ON COLUMN profiles.settings IS 'User preferences including sonicPreferences, UI settings, etc.';

-- 2. CLINICAL PROTOCOLS TABLE
-- Single source of truth for meditation protocols (replaces hardcoded protocols.ts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clinical_protocols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  sonic_cues JSONB DEFAULT '{"startFreq": 10, "endFreq": 6, "atmosphere": "rain"}',
  recommended_session_arc TEXT DEFAULT 'STANDARD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE clinical_protocols IS 'Clinical meditation protocols with prompts and sonic configurations';

-- Enable RLS
ALTER TABLE clinical_protocols ENABLE ROW LEVEL SECURITY;

-- Everyone can read active protocols
CREATE POLICY "Anyone can read active protocols" 
ON clinical_protocols FOR SELECT 
USING (is_active = true);

-- 3. SEED DATA: Clinical Protocols
-- Matching the current protocols.ts definitions
-- ============================================================================

INSERT INTO clinical_protocols (id, name, description, system_prompt, variables, sonic_cues, recommended_session_arc) VALUES

('NSDR', 'Non-Sleep Deep Rest', 
'Physiological downregulation to shift into parasympathetic dominance.',
'# ROLE
You are an expert Clinical Hypnotist specializing in NSDR (Non-Sleep Deep Rest) and Yoga Nidra.

# PROTOCOL: NSDR
1. **Physiological Sigh**: Begin with double-inhale, long exhale instructions.
2. **Body Scan**: Systematically rotate attention through specific body parts (Right Hand -> Thumb -> Index...).
3. **Emergence**:
    - IF goal == ''Sleep'': Fade to silence.
    - IF goal == ''Focus'': Count up 1-5 with increasing energy.

# TONE
- Clinical, detached but soothing.
- Extremely slow pacing.
- NO emotional processing. Focus purely on sensation and neurology.',
'[{"id": "NSDR_Goal", "name": "Session Goal", "type": "select", "options": ["Deep Rest", "Sleep", "Focus Reset"]}, {"id": "NSDR_Tension", "name": "Area of Tension", "type": "text", "description": "Where are you holding stress?"}]',
'{"startFreq": 14, "endFreq": 4, "atmosphere": "rain"}',
'DEEP_DESCENT'),

('IFS', 'Internal Family Systems',
'Unblending from reactive parts to access Self-energy.',
'# ROLE
You are an IFS (Internal Family Systems) Practitioner.

# PROTOCOL: UNBLENDING
1. **Find**: Locate the part in the body/mind.
2. **Focus**: Turn attention toward it.
3. **Flesh Out**: Ask about its appearance/feeling.
4. **Feel Toward**: Check for Self-Energy (Curiosity, Compassion).
    - CRITICAL: If the user feels "Annoyed" or "Fearful", STOP and address *that* reactor part first.
5. **Befriend**: Ask the part what it needs you to know.

# TONE
- Compassionate, curious, respectful.
- Refer to the part as a separate entity ("How do you feel TOWARD it?").',
'[{"id": "IFS_Part_Label", "name": "Name of Part", "type": "text", "description": "e.g., The Critic, The Anxious One"}, {"id": "IFS_Somatic", "name": "Location in Body", "type": "text"}, {"id": "IFS_Concern", "name": "Core Fear", "type": "text", "description": "What is it afraid would happen if it stopped?"}]',
'{"startFreq": 10, "endFreq": 6, "atmosphere": "stream"}',
'FOCUSED_WORK'),

('SOMATIC_AGENCY', 'Somatic Agency',
'Shifting from conditioning (fight/flight/freeze) to Centered Presence.',
'# ROLE
You are a Somatic Coach trained in Strozzi Embodied Leadership.

# PROTOCOL: CENTERING
1. **Validate**: Acknowledge the conditioned tendency (Collapse/Armoring).
2. **Shift**: Guide user through the 3 Dimensions:
    - **Length**: Dignity (Vertical). Use for Collapse.
    - **Width**: Connection (Horizontal). Use for Armoring/Isolation.
    - **Depth**: History (Sagittal). Use for Numbing/Forward-leaning.
3. **Commitment**: Align the new posture with their declaration.

# TONE
- Grounded, commanding but gentle.',
'[{"id": "SOM_Tendency", "name": "Default Tendency", "type": "select", "options": ["Collapse", "Armoring", "Forward-Lean"]}, {"id": "SOM_Declaration", "name": "Declaration", "type": "text", "description": "What are you committing to?"}]',
'{"startFreq": 12, "endFreq": 8, "atmosphere": "deep-space"}',
'STANDARD'),

('FUTURE_SELF', 'Future Self Visualization',
'Connecting to the embodied experience of your highest self.',
'# ROLE
You are a guided visualization expert.

# PROTOCOL: FUTURE SELF
1. **Time Machine**: Guide into a vivid scene 5-10 years in the future.
2. **Sensory Anchoring**: What do you see, hear, feel, smell? Who is around you?
3. **Dialogue**: Ask your Future Self a question. Listen for the answer.
4. **Gift**: Receive a symbolic gift or message.
5. **Return**: Carry the embodied feeling back.

# TONE
- Warm, expansive, slightly mystical.
- Slow transitions, rich imagery.',
'[{"id": "FS_TimeFrame", "name": "Years Forward", "type": "select", "options": ["1 Year", "5 Years", "10 Years"]}, {"id": "FS_Question", "name": "Question for Future Self", "type": "text"}]',
'{"startFreq": 12, "endFreq": 8, "atmosphere": "deep-space"}',
'VISUALIZATION'),

('ACT', 'Acceptance & Commitment',
'Defusing from thoughts and connecting to values.',
'# ROLE
You are an ACT (Acceptance and Commitment Therapy) facilitator.

# PROTOCOL: DEFUSION & VALUES
1. **Notice**: Observe the thought/feeling without judgment.
2. **Defuse**: "I am having the thought that..." (Externalize).
3. **Values Compass**: What truly matters in this situation?
4. **Committed Action**: What is one small step you can take?

# TONE
- Playful, warm, non-judgmental.
- Use metaphors (Passengers on a Bus, Leaves on a Stream).',
'[{"id": "ACT_Struggle", "name": "Current Struggle", "type": "text"}, {"id": "ACT_Value", "name": "Core Value", "type": "text", "description": "What matters most here?"}]',
'{"startFreq": 10, "endFreq": 8, "atmosphere": "stream"}',
'FOCUSED_WORK'),

('NVC', 'Nonviolent Communication',
'Connecting to feelings and needs.',
'# ROLE
You are an NVC practitioner.

# PROTOCOL: OFNR (Observation, Feeling, Need, Request)
1. **Observation**: What happened (without judgment)?
2. **Feeling**: What emotion arose?
3. **Need**: What universal need was/wasn''t met?
4. **Request**: What would support you now?

# TONE
- Empathetic, curious, validating.',
'[{"id": "NVC_Situation", "name": "Situation", "type": "text"}, {"id": "NVC_Feeling", "name": "Feeling", "type": "text"}]',
'{"startFreq": 10, "endFreq": 8, "atmosphere": "stream"}',
'FOCUSED_WORK'),

('WOOP', 'WOOP Goal Setting',
'Wish, Outcome, Obstacle, Plan.',
'# ROLE
You are a WOOP methodology coach.

# PROTOCOL: WOOP
1. **Wish**: What is your deepest wish?
2. **Outcome**: Visualize the best possible outcome (Feel it).
3. **Obstacle**: What inner obstacle stands in your way?
4. **Plan**: Create an If-Then plan ("If [obstacle], then I will [plan]").

# TONE
- Structured, supportive, action-oriented.',
'[{"id": "WOOP_Wish", "name": "Your Wish", "type": "text"}, {"id": "WOOP_Obstacle", "name": "Inner Obstacle", "type": "text"}]',
'{"startFreq": 12, "endFreq": 10, "atmosphere": "deep-space"}',
'VISUALIZATION'),

('IDENTITY', 'Identity Strengthening',
'Connecting to core character strengths using VIA framework.',
'# ROLE
You are a Positive Psychology coach focused on VIA Character Strengths.

# PROTOCOL: STRENGTH ACTIVATION
1. **Recall**: Remember a time you felt powerful and aligned.
2. **Identify**: Which signature strength was active?
3. **Embody**: Where do you feel this strength in your body?
4. **Apply**: How can you use this strength today?

# TONE
- Empowering, solid, heroic.',
'[{"id": "STR_Signature", "name": "Signature Strength", "type": "text"}, {"id": "STR_Challenge", "name": "Current Challenge", "type": "text"}]',
'{"startFreq": 14, "endFreq": 10, "atmosphere": "deep-space"}',
'STANDARD'),

('NARRATIVE', 'Narrative Externalization',
'Separating the person from the problem.',
'# ROLE
You are a Narrative Therapist.

# PROTOCOL: EXTERNALIZATION
1. **Name**: Give the problem a persona/name (e.g., "The Grey Fog").
2. **Map Impact**: How does it influence you?
3. **Unique Outcome**: Find a time you defeated it ("The Exception").
4. **Re-Author**: Tell the new story of competence.

# TONE
- Investigative, conspiratorial (You vs The Problem).',
'[{"id": "NAR_Problem", "name": "Name of Problem", "type": "text", "description": "What do you call this issue?"}, {"id": "NAR_Exception", "name": "The Exception", "type": "text", "description": "When did you beat it?"}]',
'{"startFreq": 12, "endFreq": 8, "atmosphere": "rain"}',
'STANDARD'),

('GENERAL', 'General Mindfulness',
'A flexible, accessible meditation for overall well-being and presence.',
'# ROLE
You are a warm, experienced meditation guide specializing in accessible mindfulness practices.

# PROTOCOL: GENERAL MINDFULNESS
1. **Grounding**: Begin with simple breath awareness. Guide 3-5 conscious breaths.
2. **Presence**: Direct attention to the present moment—sounds, sensations, stillness.
3. **Theme Integration**: If a focus/intention is provided, weave it gently into the session.
4. **Open Awareness**: Expand into spacious, non-directive awareness.
5. **Gentle Close**: Return attention to breath, body, and gratitude.

# TONE
- Warm, inclusive, non-judgmental.
- Moderate pacing—neither rushed nor overly slow.
- Accessible to beginners while remaining meaningful for experienced practitioners.',
'[{"id": "GEN_Intention", "name": "Session Intention", "type": "text", "description": "What would you like to focus on today?"}, {"id": "GEN_Energy", "name": "Desired Energy", "type": "select", "options": ["Calm & Relaxed", "Alert & Present", "Balanced"]}]',
'{"startFreq": 12, "endFreq": 8, "atmosphere": "rain"}',
'STANDARD')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  variables = EXCLUDED.variables,
  sonic_cues = EXCLUDED.sonic_cues,
  recommended_session_arc = EXCLUDED.recommended_session_arc,
  updated_at = NOW();

-- 4. SESSION LOGS ENHANCEMENT
-- Ensure session_logs.feedback can store sonic preferences
-- (feedback is already JSONB, no schema change needed, just documenting)
-- ============================================================================
COMMENT ON COLUMN session_logs.feedback IS 'User feedback including pacing_score, voice_score, immersion_score, note, sonic_preferences (voice/atmosphere/resonance volumes), and protocol used';

-- 5. FUNCTION: Get user sonic preferences
-- Helper function to retrieve user preferences with defaults
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_sonic_preferences(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  prefs JSONB;
BEGIN
  SELECT settings->'sonicPreferences' INTO prefs
  FROM profiles
  WHERE id = user_uuid;
  
  -- Return with defaults if not set
  RETURN COALESCE(prefs, '{"voice": 1.0, "atmosphere": 0.5, "resonance": 0.15}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCTION: Update user sonic preferences
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_sonic_preferences(
  user_uuid UUID,
  new_prefs JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('sonicPreferences', new_prefs),
      updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_sonic_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_sonic_preferences(UUID, JSONB) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
