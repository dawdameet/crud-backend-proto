-- Fix RLS policies to allow service role access
-- This script updates the RLS policies to allow the service role to perform operations

-- Drop existing policies
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS refresh_tokens_policy ON refresh_tokens;
DROP POLICY IF EXISTS auth_logs_policy ON auth_logs;

-- Create new policies that allow service role access
-- Users table: Allow service role full access, users can see their own data
CREATE POLICY users_service_policy ON users
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.uid() = id
    );

-- Refresh tokens table: Allow service role full access, users can see their own tokens
CREATE POLICY refresh_tokens_service_policy ON refresh_tokens
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.uid() = user_id
    );

-- Auth logs table: Allow service role full access, users can see their own logs
CREATE POLICY auth_logs_service_policy ON auth_logs
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.uid() = user_id
    );

-- Alternative approach: Disable RLS for service role operations
-- Uncomment these lines if the above policies don't work:

-- ALTER TABLE users FORCE ROW LEVEL SECURITY;
-- ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
-- ALTER TABLE auth_logs FORCE ROW LEVEL SECURITY;

-- CREATE POLICY users_bypass_rls ON users
--     FOR ALL TO service_role USING (true);

-- CREATE POLICY refresh_tokens_bypass_rls ON refresh_tokens
--     FOR ALL TO service_role USING (true);

-- CREATE POLICY auth_logs_bypass_rls ON auth_logs
--     FOR ALL TO service_role USING (true);
