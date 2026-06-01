-- Study Plans Table
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  plan_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
  content TEXT NOT NULL, -- full plan text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Create index for faster queries
CREATE INDEX study_plans_user_id_idx ON study_plans(user_id);
CREATE INDEX study_plans_topic_idx ON study_plans(topic);
CREATE INDEX study_plans_created_at_idx ON study_plans(created_at DESC);

-- Row Level Security
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);
