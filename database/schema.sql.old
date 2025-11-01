-- SQLite Database Schema for Social Media Downloader
-- This schema replaces JSON files with a normalized relational database

-- Enable foreign keys (must be set per connection in SQLite)
PRAGMA foreign_keys = ON;

-- ============================================================
-- Table: api_types
-- Purpose: Store different API endpoint types
-- ============================================================
CREATE TABLE IF NOT EXISTS api_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,  -- e.g., "get_list_fb_user_photos"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: users
-- Purpose: Central table for all unique usernames
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,  -- e.g., "trang.quach.526875"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: user_cursors
-- Purpose: Store pagination cursors (replaces last_cursors.json)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_cursors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    api_type_id INTEGER NOT NULL,
    cursor TEXT NOT NULL,  -- Pagination cursor string
    pages_loaded INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (api_type_id) REFERENCES api_types(id) ON DELETE CASCADE,

    -- One cursor per user per API type
    UNIQUE(user_id, api_type_id)
);

-- ============================================================
-- Table: saved_media
-- Purpose: Track downloaded media (replaces saved_images.json)
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    media_id TEXT NOT NULL,  -- Facebook/Instagram post ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- One media item per user (prevent duplicates)
    UNIQUE(user_id, media_id)
);

-- ============================================================
-- Table: api_reports
-- Purpose: Store API call session metadata (replaces ig_user_stories_report.jsonl)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_type_id INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,  -- When the API call was made
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (api_type_id) REFERENCES api_types(id) ON DELETE CASCADE
);

-- ============================================================
-- Table: report_details
-- Purpose: Store individual user results within an API report
-- ============================================================
CREATE TABLE IF NOT EXISTS report_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    url TEXT,  -- Original URL fetched
    total_items INTEGER DEFAULT 0,
    items_saved INTEGER DEFAULT 0,
    items_not_saved INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,  -- Duration in seconds
    pages_fetched INTEGER DEFAULT 0,

    -- Foreign keys
    FOREIGN KEY (report_id) REFERENCES api_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================

-- Index for cursor lookups
CREATE INDEX IF NOT EXISTS idx_user_cursors_lookup
    ON user_cursors(user_id, api_type_id);

-- Index for saved media checks
CREATE INDEX IF NOT EXISTS idx_saved_media_lookup
    ON saved_media(user_id, media_id);

-- Index for saved media by date
CREATE INDEX IF NOT EXISTS idx_saved_media_created
    ON saved_media(created_at);

-- Index for reports by timestamp
CREATE INDEX IF NOT EXISTS idx_reports_timestamp
    ON api_reports(timestamp DESC);

-- Index for reports by API type
CREATE INDEX IF NOT EXISTS idx_reports_api_type
    ON api_reports(api_type_id);

-- Index for report details by user
CREATE INDEX IF NOT EXISTS idx_report_details_user
    ON report_details(user_id);

-- Index for report details by report
CREATE INDEX IF NOT EXISTS idx_report_details_report
    ON report_details(report_id);

-- ============================================================
-- VIEWS for Common Queries
-- ============================================================

-- View: User statistics
CREATE VIEW IF NOT EXISTS v_user_stats AS
SELECT
    u.id,
    u.username,
    COUNT(DISTINCT sm.id) as total_saved_media,
    MAX(sm.created_at) as last_download_date,
    COUNT(DISTINCT uc.id) as active_api_types
FROM users u
LEFT JOIN saved_media sm ON u.id = sm.user_id
LEFT JOIN user_cursors uc ON u.id = uc.user_id
GROUP BY u.id, u.username;

-- View: Recent reports with details
CREATE VIEW IF NOT EXISTS v_recent_reports AS
SELECT
    ar.id as report_id,
    at.name as api_name,
    ar.timestamp,
    u.username,
    rd.url,
    rd.total_items,
    rd.items_saved,
    rd.items_not_saved,
    rd.duration,
    rd.pages_fetched
FROM api_reports ar
JOIN api_types at ON ar.api_type_id = at.id
JOIN report_details rd ON ar.id = rd.report_id
JOIN users u ON rd.user_id = u.id
ORDER BY ar.timestamp DESC;

-- View: API performance metrics
CREATE VIEW IF NOT EXISTS v_api_performance AS
SELECT
    at.name as api_name,
    COUNT(DISTINCT ar.id) as total_calls,
    COUNT(DISTINCT rd.user_id) as unique_users,
    SUM(rd.total_items) as total_items_fetched,
    SUM(rd.items_saved) as total_items_saved,
    AVG(rd.duration) as avg_duration_seconds,
    AVG(rd.pages_fetched) as avg_pages_per_call
FROM api_types at
JOIN api_reports ar ON at.id = ar.api_type_id
JOIN report_details rd ON ar.id = rd.report_id
GROUP BY at.name;

-- ============================================================
-- TRIGGERS for Data Integrity
-- ============================================================

-- Trigger: Update last_updated on cursor changes
CREATE TRIGGER IF NOT EXISTS trg_update_cursor_timestamp
AFTER UPDATE ON user_cursors
FOR EACH ROW
BEGIN
    UPDATE user_cursors
    SET last_updated = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- End of trigger statement

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Insert common API types
INSERT OR IGNORE INTO api_types (name) VALUES
    ('get_list_fb_user_photos'),
    ('get_list_fb_user_reels'),
    ('get_list_fb_highlights'),
    ('get_list_ig_post'),
    ('get_list_ig_user_stories');
