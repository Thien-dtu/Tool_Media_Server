-- Migration: Add platform_id support to users table
-- This enables using Facebook UID and Instagram UUID as primary identifiers
-- while maintaining backward compatibility with username-based lookups

-- Add new columns
ALTER TABLE users ADD COLUMN platform TEXT;  -- 'facebook' or 'instagram'
ALTER TABLE users ADD COLUMN platform_id TEXT;  -- Facebook UID or Instagram UUID
ALTER TABLE users ADD COLUMN platform_url TEXT;  -- Original URL for reference
ALTER TABLE users ADD COLUMN migrated_at DATETIME;  -- When platform_id was added

-- Create unique index for platform_id lookups
-- Only indexes rows where platform_id is NOT NULL
CREATE UNIQUE INDEX idx_users_platform_id
ON users(platform, platform_id)
WHERE platform_id IS NOT NULL;

-- Create index for platform-based queries
CREATE INDEX idx_users_platform
ON users(platform)
WHERE platform IS NOT NULL;

-- Create view to track migration progress
CREATE VIEW v_migration_progress AS
SELECT
    COUNT(*) as total_users,
    COUNT(platform_id) as migrated_users,
    COUNT(*) - COUNT(platform_id) as pending_users,
    ROUND(COUNT(platform_id) * 100.0 / COUNT(*), 2) as migration_percent,
    COUNT(CASE WHEN platform = 'facebook' THEN 1 END) as facebook_users,
    COUNT(CASE WHEN platform = 'instagram' THEN 1 END) as instagram_users,
    COUNT(CASE WHEN platform IS NULL THEN 1 END) as unknown_platform_users
FROM users;

-- Create view to show users needing migration
CREATE VIEW v_users_needing_migration AS
SELECT
    u.id,
    u.username,
    u.platform,
    u.created_at
FROM users u
WHERE u.platform_id IS NULL
ORDER BY u.created_at DESC;

-- Update trigger to auto-set migrated_at
CREATE TRIGGER trg_set_migrated_at
AFTER UPDATE OF platform_id ON users
FOR EACH ROW
WHEN NEW.platform_id IS NOT NULL AND OLD.platform_id IS NULL
BEGIN
    UPDATE users SET migrated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
