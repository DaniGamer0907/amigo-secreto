CREATE OR REPLACE FUNCTION mark_assignment_revealed(p_assignment_id UUID, p_token TEXT)
RETURNS VOID AS $$
BEGIN
  SET LOCAL row_security = off;
  PERFORM set_config('app.session_token', p_token, TRUE);
  UPDATE assignments
  SET revealed = true
  WHERE id = p_assignment_id
    AND giver_id = (SELECT id FROM participants WHERE session_token = p_token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
