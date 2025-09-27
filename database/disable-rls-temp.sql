-- Temporary fix: Disable RLS for development/testing
-- WARNING: This removes security restrictions. Use only for development!

-- Disable Row Level Security temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later, run:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
