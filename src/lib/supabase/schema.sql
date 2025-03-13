-- Map Painter .io Database Schema
-- This file defines the database schema for the Map Painter .io game

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game Instances Table
-- Tracks unique game rooms
CREATE TABLE IF NOT EXISTS game_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_resource_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}'::JSONB
);

-- Players Table
-- Stores player data per instance
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id TEXT, -- Optional Clerk user ID
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  resources INTEGER DEFAULT 10,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite index for efficient queries
  UNIQUE(game_instance_id, user_id)
);

-- Map States Table
-- Tracks state ownership and resources
CREATE TABLE IF NOT EXISTS map_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  state_id TEXT NOT NULL, -- GeoJSON feature ID
  owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite index for efficient queries
  UNIQUE(game_instance_id, state_id)
);

-- Adjacency Table
-- Defines state adjacency relationships
CREATE TABLE IF NOT EXISTS adjacency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  state_id_1 TEXT NOT NULL,
  state_id_2 TEXT NOT NULL,
  
  -- Ensure uniqueness of adjacency relationships
  UNIQUE(game_instance_id, state_id_1, state_id_2),
  
  -- Ensure we don't have duplicate entries in reverse order
  CHECK (state_id_1 < state_id_2)
);

-- Game Events Table
-- Logs game events for analytics
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE game_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjacency ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development)
-- In production, you would want more restrictive policies
CREATE POLICY "Allow public read access to game_instances" ON game_instances FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to game_instances" ON game_instances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to game_instances" ON game_instances FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to players" ON players FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to map_states" ON map_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to map_states" ON map_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to map_states" ON map_states FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to adjacency" ON adjacency FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to adjacency" ON adjacency FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to game_events" ON game_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to game_events" ON game_events FOR INSERT WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update timestamps
CREATE TRIGGER update_game_instances_updated_at
BEFORE UPDATE ON game_instances
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Enable Realtime for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE map_states;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Create indexes for performance
CREATE INDEX idx_map_states_game_instance_id ON map_states(game_instance_id);
CREATE INDEX idx_players_game_instance_id ON players(game_instance_id);
CREATE INDEX idx_adjacency_game_instance_id ON adjacency(game_instance_id);
CREATE INDEX idx_game_events_game_instance_id ON game_events(game_instance_id); 