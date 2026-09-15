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

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policy para assignments: un participante solo puede ver asignaciones donde es el giver
CREATE POLICY "participants_can_only_see_own_assignments"
ON assignments FOR SELECT
USING (
  giver_id = (
    SELECT id
    FROM participants
    WHERE session_token = current_setting('app.session_token', TRUE)
  )
);

-- Policy para rooms: un participante puede ver rooms donde participa
CREATE POLICY "participants_can_see_rooms"
ON rooms FOR SELECT
USING (
  id IN (SELECT room_id FROM participants WHERE session_token = current_setting('app.session_token', TRUE))
);

-- Policy para participants: un participante puede ver su propia fila
CREATE POLICY "participants_can_see_themselves"
ON participants FOR SELECT
USING (
  session_token = current_setting('app.session_token', TRUE)
);
