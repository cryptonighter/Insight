-- Fix Registry RLS (Idempotent)
-- Run this in the Supabase SQL Editor to secure your tables

-- 1. PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. INSIGHTS
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own insights" ON insights;
DROP POLICY IF EXISTS "Users can insert own insights" ON insights;
DROP POLICY IF EXISTS "Users can update own insights" ON insights;
DROP POLICY IF EXISTS "Users can delete own insights" ON insights;

CREATE POLICY "Users can view own insights" ON insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own insights" ON insights FOR DELETE USING (auth.uid() = user_id);


-- 3. PARTS LEDGER
ALTER TABLE parts_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own parts" ON parts_ledger;
DROP POLICY IF EXISTS "Users can insert own parts" ON parts_ledger;
DROP POLICY IF EXISTS "Users can update own parts" ON parts_ledger;
DROP POLICY IF EXISTS "Users can delete own parts" ON parts_ledger;

CREATE POLICY "Users can view own parts" ON parts_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own parts" ON parts_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own parts" ON parts_ledger FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own parts" ON parts_ledger FOR DELETE USING (auth.uid() = user_id);


-- 4. SOMATIC ANCHORS
ALTER TABLE somatic_anchors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own anchors" ON somatic_anchors;
DROP POLICY IF EXISTS "Users can insert own anchors" ON somatic_anchors;
DROP POLICY IF EXISTS "Users can update own anchors" ON somatic_anchors;
DROP POLICY IF EXISTS "Users can delete own anchors" ON somatic_anchors;

CREATE POLICY "Users can view own anchors" ON somatic_anchors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own anchors" ON somatic_anchors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own anchors" ON somatic_anchors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own anchors" ON somatic_anchors FOR DELETE USING (auth.uid() = user_id);


-- 5. VALUES INVENTORY
ALTER TABLE values_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own values" ON values_inventory;
DROP POLICY IF EXISTS "Users can insert own values" ON values_inventory;
DROP POLICY IF EXISTS "Users can update own values" ON values_inventory;
DROP POLICY IF EXISTS "Users can delete own values" ON values_inventory;

CREATE POLICY "Users can view own values" ON values_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own values" ON values_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own values" ON values_inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own values" ON values_inventory FOR DELETE USING (auth.uid() = user_id);


-- 6. PATTERNS
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can insert own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can update own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can delete own patterns" ON patterns;

CREATE POLICY "Users can view own patterns" ON patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patterns" ON patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patterns" ON patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own patterns" ON patterns FOR DELETE USING (auth.uid() = user_id);
