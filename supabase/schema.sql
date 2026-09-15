-- ============================================
-- Esquema Amigo Secreto
-- ============================================

-- Tabla rooms
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  host_id     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'waiting',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla participants
CREATE TABLE IF NOT EXISTS participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  session_token   TEXT UNIQUE NOT NULL,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla assignments
CREATE TABLE IF NOT EXISTS assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  giver_id        UUID NOT NULL REFERENCES participants(id),
  receiver_id     UUID NOT NULL REFERENCES participants(id),
  revealed        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS participants_room_name_unique
ON participants (room_id, lower(btrim(name)));

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE participants FORCE ROW LEVEL SECURITY;
ALTER TABLE assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_can_only_see_own_assignments" ON assignments;
DROP POLICY IF EXISTS "participants_can_see_rooms" ON rooms;
DROP POLICY IF EXISTS "participants_can_see_own_room" ON participants;
DROP POLICY IF EXISTS "rooms_are_readable" ON rooms;
DROP POLICY IF EXISTS "rooms_can_be_created" ON rooms;
DROP POLICY IF EXISTS "participants_are_readable" ON participants;
DROP POLICY IF EXISTS "participants_can_join_waiting_rooms" ON participants;

CREATE POLICY "rooms_are_readable"
ON rooms FOR SELECT
USING (TRUE);

CREATE POLICY "rooms_can_be_created"
ON rooms FOR INSERT
WITH CHECK (
  code ~ '^[A-Z0-9]{6}$'
  AND btrim(host_id) <> ''
  AND status = 'waiting'
);

CREATE POLICY "participants_are_readable"
ON participants FOR SELECT
USING (TRUE);

CREATE POLICY "participants_can_join_waiting_rooms"
ON participants FOR INSERT
WITH CHECK (
  btrim(name) <> ''
  AND btrim(session_token) <> ''
  AND EXISTS (
    SELECT 1
    FROM rooms
    WHERE rooms.id = participants.room_id
      AND rooms.status = 'waiting'
  )
);

CREATE OR REPLACE FUNCTION set_session_token(p_token TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.session_token', p_token, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_reveal_assignment(p_token TEXT, p_room_id UUID)
RETURNS TABLE (
  id UUID,
  room_id UUID,
  giver_id UUID,
  receiver_id UUID,
  revealed BOOLEAN,
  receiver_name TEXT
) AS $$
BEGIN
  PERFORM set_config('app.session_token', p_token, TRUE);
  RETURN QUERY
  SELECT a.id, a.room_id, a.giver_id, a.receiver_id, a.revealed, p.name AS receiver_name
  FROM assignments a
  JOIN participants p ON p.id = a.receiver_id
  WHERE a.room_id = p_room_id
    AND a.giver_id = (SELECT id FROM participants WHERE session_token = p_token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION mark_assignment_revealed(p_token TEXT, p_assignment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE assignments
  SET revealed = TRUE
  WHERE id = p_assignment_id
    AND giver_id = (
      SELECT id
      FROM participants
      WHERE session_token = p_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_reveal_assignment(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION mark_assignment_revealed(TEXT, UUID) TO anon;
