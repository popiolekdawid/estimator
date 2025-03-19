-- Create sessions table
CREATE TABLE sessions (
  id VARCHAR PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR NOT NULL CHECK (status IN ('waiting', 'voting', 'completed')),
  time_limit INTEGER NOT NULL
);

-- Create participants table
CREATE TABLE participants (
  user_id VARCHAR NOT NULL,
  session_id VARCHAR NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  voted BOOLEAN DEFAULT FALSE,
  is_host BOOLEAN DEFAULT FALSE,
  estimate NUMERIC,
  PRIMARY KEY (user_id, session_id)
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing public access for this simple app)
CREATE POLICY "Allow full access to sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow full access to participants" ON participants FOR ALL USING (true);

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE sessions;
ALTER publication supabase_realtime ADD TABLE participants;
