-- ============================================
-- TOURNAMENT SYSTEM - โค้ชเลือกนักกีฬาเข้าร่วมเอง
-- ============================================

-- ตาราง tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  name TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  max_participants INTEGER,
  
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_max_participants CHECK (max_participants IS NULL OR max_participants > 0)
);

-- ตารางลงทะเบียนนักกีฬา
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'selected' CHECK (
    status IN ('selected', 'waiting', 'confirmed', 'declined')
  ),
  
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coach_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(tournament_id, athlete_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_club_id ON tournaments(club_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_athlete ON tournament_participants(athlete_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON tournament_participants(status);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Coaches view own club tournaments" ON tournaments;
DROP POLICY IF EXISTS "Athletes view their tournaments" ON tournaments;
DROP POLICY IF EXISTS "Coaches create tournaments" ON tournaments;
DROP POLICY IF EXISTS "Coaches update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Coaches delete tournaments" ON tournaments;

DROP POLICY IF EXISTS "Coaches view participants" ON tournament_participants;
DROP POLICY IF EXISTS "Athletes view own participation" ON tournament_participants;
DROP POLICY IF EXISTS "Coaches add participants" ON tournament_participants;
DROP POLICY IF EXISTS "Coaches update participants" ON tournament_participants;
DROP POLICY IF EXISTS "Coaches remove participants" ON tournament_participants;

-- RLS Policies for tournaments
CREATE POLICY "Coaches view own club tournaments"
  ON tournaments FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

CREATE POLICY "Athletes view their tournaments"
  ON tournaments FOR SELECT
  USING (
    id IN (
      SELECT tournament_id FROM tournament_participants
      WHERE athlete_id = auth.uid()
    )
  );

CREATE POLICY "Coaches create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

CREATE POLICY "Coaches update tournaments"
  ON tournaments FOR UPDATE
  USING (
    club_id IN (
      SELECT club_id FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

CREATE POLICY "Coaches delete tournaments"
  ON tournaments FOR DELETE
  USING (
    club_id IN (
      SELECT club_id FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- RLS Policies for tournament_participants
CREATE POLICY "Coaches view participants"
  ON tournament_participants FOR SELECT
  USING (
    tournament_id IN (
      SELECT t.id FROM tournaments t
      INNER JOIN profiles p ON p.club_id = t.club_id
      WHERE p.id = auth.uid() AND p.role = 'coach'
    )
  );

CREATE POLICY "Athletes view own participation"
  ON tournament_participants FOR SELECT
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches add participants"
  ON tournament_participants FOR INSERT
  WITH CHECK (
    tournament_id IN (
      SELECT t.id FROM tournaments t
      INNER JOIN profiles p ON p.club_id = t.club_id
      WHERE p.id = auth.uid() AND p.role = 'coach'
    )
    AND athlete_id IN (
      SELECT p.id FROM profiles p
      INNER JOIN tournaments t ON t.id = tournament_id
      WHERE p.club_id = t.club_id AND p.role = 'athlete'
    )
  );

CREATE POLICY "Coaches update participants"
  ON tournament_participants FOR UPDATE
  USING (
    tournament_id IN (
      SELECT t.id FROM tournaments t
      INNER JOIN profiles p ON p.club_id = t.club_id
      WHERE p.id = auth.uid() AND p.role = 'coach'
    )
  );

CREATE POLICY "Coaches remove participants"
  ON tournament_participants FOR DELETE
  USING (
    tournament_id IN (
      SELECT t.id FROM tournaments t
      INNER JOIN profiles p ON p.club_id = t.club_id
      WHERE p.id = auth.uid() AND p.role = 'coach'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_participants_updated_at ON tournament_participants;
CREATE TRIGGER update_tournament_participants_updated_at
  BEFORE UPDATE ON tournament_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'Tables created' as status;
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('tournaments', 'tournament_participants');
