CREATE OR REPLACE FUNCTION set_session_token(p_token TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.session_token', p_token, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
