-- Create danger_zones table
CREATE TABLE IF NOT EXISTS danger_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    severity_level VARCHAR(20) DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    is_verified BOOLEAN DEFAULT false,
    verification_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_danger_zones_location ON danger_zones(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_danger_zones_user_id ON danger_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_danger_zones_severity ON danger_zones(severity_level);
CREATE INDEX IF NOT EXISTS idx_danger_zones_verified ON danger_zones(is_verified);
CREATE INDEX IF NOT EXISTS idx_danger_zones_created_at ON danger_zones(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_danger_zones_updated_at BEFORE UPDATE ON danger_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS for danger_zones table (for development)
ALTER TABLE danger_zones DISABLE ROW LEVEL SECURITY;

-- Grant permissions to service role
GRANT ALL ON danger_zones TO service_role;

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'danger_zones' 
ORDER BY ordinal_position;
