-- Create soundscapes table
CREATE TABLE IF NOT EXISTS soundscapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  metadata JSONB NOT NULL, -- Stores mood, intensity, description, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE soundscapes ENABLE ROW LEVEL SECURITY;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Public read access for soundscapes" ON soundscapes;
CREATE POLICY "Public read access for soundscapes" ON soundscapes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins start upload soundscapes" ON soundscapes;
CREATE POLICY "Admins start upload soundscapes" ON soundscapes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete soundscapes" ON soundscapes;
CREATE POLICY "Admins can delete soundscapes" ON soundscapes
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket creation note:
-- You must create a public bucket named 'audio-assets' in the Supabase Dashboard -> Storage.
-- Add a policy to allow Authenticated users to Upload, and Public to Read.
