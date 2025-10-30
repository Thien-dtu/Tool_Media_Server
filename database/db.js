/**
 * Database Wrapper Module
 * Provides easy-to-use functions for interacting with the SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'social_media.db');

// Promisify SQLite operations
function runAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

class Database {
    constructor(dbPath = DB_PATH) {
        this.dbPath = dbPath;
        this.db = null;
    }

    // Connect to database
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else {
                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve();
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // ============================================================
    // USER OPERATIONS (with platform_id support)
    // ============================================================

    /**
     * Get or create user with platform_id support
     * @param {Object} userData - User data
     * @param {string} userData.username - Username
     * @param {string} [userData.platform] - 'facebook' or 'instagram'
     * @param {string} [userData.platform_id] - UID or UUID
     * @param {string} [userData.platform_url] - Original URL
     * @returns {Promise<number>} - User ID
     */
    async getOrCreateUser(userData) {
        const { username, platform, platform_id, platform_url } = userData;

        // Try to find user by platform_id first (most reliable)
        if (platform && platform_id) {
            let user = await getAsync(this.db,
                'SELECT id FROM users WHERE platform = ? AND platform_id = ?',
                [platform, platform_id]
            );
            if (user) return user.id;
        }

        // Fall back to username lookup
        let user = await getAsync(this.db,
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (user) {
            // User exists - update platform_id if provided and not set
            if (platform_id && platform) {
                const existing = await getAsync(this.db,
                    'SELECT platform_id FROM users WHERE id = ?',
                    [user.id]
                );

                if (!existing.platform_id) {
                    await runAsync(this.db,
                        `UPDATE users
                         SET platform = ?, platform_id = ?, platform_url = ?
                         WHERE id = ?`,
                        [platform, platform_id, platform_url, user.id]
                    );
                    console.log(`✅ Migrated user ${username} → ${platform}:${platform_id}`);
                }
            }
            return user.id;
        }

        // Create new user
        const result = await runAsync(this.db,
            `INSERT INTO users (username, platform, platform_id, platform_url)
             VALUES (?, ?, ?, ?)`,
            [username, platform || null, platform_id || null, platform_url || null]
        );
        return result.lastID;
    }

    /**
     * Update user's platform_id
     * @param {string} username - Username
     * @param {string} platform - 'facebook' or 'instagram'
     * @param {string} platform_id - UID or UUID
     * @param {string} [platform_url] - Original URL
     * @returns {Promise<boolean>} - True if updated
     */
    async updateUserPlatformId(username, platform, platform_id, platform_url = null) {
        const result = await runAsync(this.db,
            `UPDATE users
             SET platform = ?, platform_id = ?, platform_url = ?
             WHERE username = ?`,
            [platform, platform_id, platform_url, username]
        );
        return result.changes > 0;
    }

    /**
     * Get user by username or platform_id
     * @param {string} identifier - Username or platform_id
     * @param {string} [platform] - Optional platform for platform_id lookup
     * @returns {Promise<Object|null>} - User object or null
     */
    async getUser(identifier, platform = null) {
        if (platform) {
            // Try platform_id lookup first
            const user = await getAsync(this.db,
                'SELECT * FROM users WHERE platform = ? AND platform_id = ?',
                [platform, identifier]
            );
            if (user) return user;
        }

        // Fall back to username lookup
        return await getAsync(this.db,
            'SELECT * FROM users WHERE username = ?',
            [identifier]
        );
    }

    // ============================================================
    // SAVED MEDIA OPERATIONS
    // ============================================================

    /**
     * Check if media is already saved
     * @param {string} username - User's username
     * @param {string} mediaId - Media ID
     * @returns {Promise<boolean>} - True if saved
     */
    async isMediaSaved(username, mediaId) {
        const result = await getAsync(this.db,
            `SELECT COUNT(*) as count
             FROM saved_media sm
             JOIN users u ON sm.user_id = u.id
             WHERE u.username = ? AND sm.media_id = ?`,
            [username, mediaId]
        );
        return result.count > 0;
    }

    /**
     * Check multiple media IDs for a user
     * @param {string} username - User's username
     * @param {string[]} mediaIds - Array of media IDs
     * @returns {Promise<string[]>} - Array of saved media IDs
     */
    async getMultipleSavedMedia(username, mediaIds) {
        const placeholders = mediaIds.map(() => '?').join(',');
        const rows = await allAsync(this.db,
            `SELECT sm.media_id
             FROM saved_media sm
             JOIN users u ON sm.user_id = u.id
             WHERE u.username = ? AND sm.media_id IN (${placeholders})`,
            [username, ...mediaIds]
        );
        return rows.map(r => r.media_id);
    }

    /**
     * Save media item (with platform_id support)
     * @param {string|Object} usernameOrData - Username string or user data object
     * @param {string} mediaId - Media ID
     * @returns {Promise<void>}
     */
    async saveMedia(usernameOrData, mediaId) {
        // Support both old and new API
        let userData;
        if (typeof usernameOrData === 'string') {
            userData = { username: usernameOrData };
        } else {
            userData = usernameOrData;
        }

        // Get or create user (with auto-migration)
        const userId = await this.getOrCreateUser(userData);

        // Insert media (ignore if already exists)
        await runAsync(this.db,
            'INSERT OR IGNORE INTO saved_media (user_id, media_id) VALUES (?, ?)',
            [userId, mediaId]
        );
    }

    /**
     * Batch save multiple media items
     * @param {Array<{username: string, mediaId: string}>} items - Array of items to save
     * @returns {Promise<number>} - Number of items saved
     */
    async batchSaveMedia(items) {
        let saved = 0;
        for (const item of items) {
            await this.saveMedia(item.username, item.mediaId);
            saved++;
        }
        return saved;
    }

    /**
     * Get all saved media for a user
     * @param {string} username - User's username
     * @returns {Promise<Array>} - Array of saved media
     */
    async getSavedMediaByUser(username) {
        return await allAsync(this.db,
            `SELECT sm.media_id, sm.created_at
             FROM saved_media sm
             JOIN users u ON sm.user_id = u.id
             WHERE u.username = ?
             ORDER BY sm.created_at DESC`,
            [username]
        );
    }

    // ============================================================
    // CURSOR OPERATIONS
    // ============================================================

    /**
     * Get cursor for user and API type
     * @param {string} username - User's username
     * @param {string} apiName - API type name
     * @returns {Promise<{cursor: string, pagesLoaded: number}|null>}
     */
    async getCursor(username, apiName) {
        const result = await getAsync(this.db,
            `SELECT uc.cursor, uc.pages_loaded as pagesLoaded
             FROM user_cursors uc
             JOIN users u ON uc.user_id = u.id
             JOIN api_types a ON uc.api_type_id = a.id
             WHERE u.username = ? AND a.name = ?`,
            [username, apiName]
        );
        return result || null;
    }

    /**
     * Get cursors for multiple users
     * @param {string} apiName - API type name
     * @param {string[]} usernames - Array of usernames
     * @returns {Promise<Object>} - Object with username as key
     */
    async getMultipleCursors(apiName, usernames) {
        const placeholders = usernames.map(() => '?').join(',');
        const rows = await allAsync(this.db,
            `SELECT u.username, uc.cursor, uc.pages_loaded as pagesLoaded
             FROM user_cursors uc
             JOIN users u ON uc.user_id = u.id
             JOIN api_types a ON uc.api_type_id = a.id
             WHERE a.name = ? AND u.username IN (${placeholders})`,
            [apiName, ...usernames]
        );

        const result = {};
        for (const row of rows) {
            result[row.username] = {
                cursor: row.cursor,
                pagesLoaded: row.pagesLoaded
            };
        }
        return result;
    }

    /**
     * Save or update cursor
     * @param {string} username - User's username
     * @param {string} apiName - API type name
     * @param {string} cursor - Cursor string
     * @param {number} pagesLoaded - Number of pages loaded
     * @returns {Promise<void>}
     */
    async saveCursor(username, apiName, cursor, pagesLoaded = 0) {
        // Get or create user
        let user = await getAsync(this.db, 'SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
            const result = await runAsync(this.db, 'INSERT INTO users (username) VALUES (?)', [username]);
            user = { id: result.lastID };
        }

        // Get or create API type
        let apiType = await getAsync(this.db, 'SELECT id FROM api_types WHERE name = ?', [apiName]);
        if (!apiType) {
            const result = await runAsync(this.db, 'INSERT INTO api_types (name) VALUES (?)', [apiName]);
            apiType = { id: result.lastID };
        }

        // Insert or update cursor
        await runAsync(this.db,
            `INSERT INTO user_cursors (user_id, api_type_id, cursor, pages_loaded)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, api_type_id)
             DO UPDATE SET cursor = ?, pages_loaded = ?, last_updated = CURRENT_TIMESTAMP`,
            [user.id, apiType.id, cursor, pagesLoaded, cursor, pagesLoaded]
        );
    }

    // ============================================================
    // REPORT OPERATIONS
    // ============================================================

    /**
     * Save API report
     * @param {string} apiName - API type name
     * @param {Array} reportDetails - Array of report detail objects
     * @param {string} timestamp - ISO timestamp
     * @returns {Promise<number>} - Report ID
     */
    async saveReport(apiName, reportDetails, timestamp) {
        // Get or create API type
        let apiType = await getAsync(this.db, 'SELECT id FROM api_types WHERE name = ?', [apiName]);
        if (!apiType) {
            const result = await runAsync(this.db, 'INSERT INTO api_types (name) VALUES (?)', [apiName]);
            apiType = { id: result.lastID };
        }

        // Insert report
        const reportResult = await runAsync(this.db,
            'INSERT INTO api_reports (api_type_id, timestamp) VALUES (?, ?)',
            [apiType.id, timestamp]
        );
        const reportId = reportResult.lastID;

        // Insert report details
        for (const detail of reportDetails) {
            // Get or create user
            let user = await getAsync(this.db, 'SELECT id FROM users WHERE username = ?', [detail.username]);
            if (!user) {
                const result = await runAsync(this.db, 'INSERT INTO users (username) VALUES (?)', [detail.username]);
                user = { id: result.lastID };
            }

            // Parse duration (HH:MM:SS to seconds)
            const duration = this._parseDuration(detail.time);

            await runAsync(this.db,
                `INSERT INTO report_details
                 (report_id, user_id, url, total_items, items_saved, items_not_saved, duration, pages_fetched)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [reportId, user.id, detail.url, detail.total, detail.have, detail.nohave, duration, detail.pages]
            );
        }

        return reportId;
    }

    /**
     * Get recent reports
     * @param {number} limit - Number of reports to retrieve
     * @returns {Promise<Array>} - Array of report objects
     */
    async getRecentReports(limit = 10) {
        return await allAsync(this.db,
            `SELECT * FROM v_recent_reports LIMIT ?`,
            [limit]
        );
    }

    /**
     * Get reports by date range
     * @param {string} startDate - ISO date string
     * @param {string} endDate - ISO date string
     * @returns {Promise<Array>} - Array of report objects
     */
    async getReportsByDateRange(startDate, endDate) {
        return await allAsync(this.db,
            `SELECT * FROM v_recent_reports
             WHERE timestamp BETWEEN ? AND ?
             ORDER BY timestamp DESC`,
            [startDate, endDate]
        );
    }

    // ============================================================
    // STATISTICS
    // ============================================================

    /**
     * Get user statistics
     * @returns {Promise<Array>} - Array of user stats
     */
    async getUserStats() {
        return await allAsync(this.db, 'SELECT * FROM v_user_stats ORDER BY total_saved_media DESC');
    }

    /**
     * Get API performance metrics
     * @returns {Promise<Array>} - Array of API performance stats
     */
    async getApiPerformance() {
        return await allAsync(this.db, 'SELECT * FROM v_api_performance');
    }

    /**
     * Get migration progress
     * @returns {Promise<Object>} - Migration statistics
     */
    async getMigrationProgress() {
        return await getAsync(this.db, 'SELECT * FROM v_migration_progress');
    }

    /**
     * Get users needing migration
     * @param {number} limit - Maximum users to return
     * @returns {Promise<Array>} - Array of users without platform_id
     */
    async getUsersNeedingMigration(limit = 100) {
        return await allAsync(this.db,
            'SELECT * FROM v_users_needing_migration LIMIT ?',
            [limit]
        );
    }

    // ============================================================
    // UTILITIES
    // ============================================================

    _parseDuration(durationStr) {
        if (!durationStr) return 0;
        const parts = durationStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
}

// Singleton instance
let instance = null;

/**
 * Get database instance
 * @returns {Database}
 */
function getDatabase() {
    if (!instance) {
        instance = new Database();
    }
    return instance;
}

module.exports = {
    Database,
    getDatabase
};
