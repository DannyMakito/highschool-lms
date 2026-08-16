CREATE TABLE IF NOT EXISTS user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own push tokens"
  ON user_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON user_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own push tokens"
  ON user_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON user_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Allow the service role to read all tokens for sending notifications
CREATE POLICY "Service role can read all push tokens"
  ON user_push_tokens FOR SELECT
  USING (auth.role() = 'service_role');
