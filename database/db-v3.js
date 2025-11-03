/*
 * db-v2.js (Merged with db.js features)
 * UID-based architecture with extended backward-compatible utilities
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'social_media.db');

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

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else {
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve();
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    async getUserByUid(platform, uid) {
        const platformId = platform === 'facebook' ? 1 : 2;
        return await getAsync(this.db,
            `SELECT u.*, uh.username, uh.profile_url
             FROM users u
             LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
             WHERE u.platform_id = ? AND u.uid = ?`,
            [platformId, uid]
        );
    }

    async getUserByUsername(username) {
        return await getAsync(this.db,
            `SELECT u.*, uh.username, uh.profile_url, p.platform_name
             FROM users u
             JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
             JOIN platforms p ON u.platform_id = p.platform_id
             WHERE uh.username = ?`,
            [username]
        );
    }

    async getOrCreateUser(userData) {
        const { platform, uid, username, profile_url } = userData;
        const platformId = platform === 'facebook' ? 1 : 2;

        if (uid) {
            let user = await this.getUserByUid(platform, uid);
            if (user) {
                if (username && user.username && username !== user.username) {
                    await this.updateUsername(user.id, username, profile_url);
                    console.log(`🔄 Username changed: ${user.username} → ${username}`);
                    user = await this.getUserByUid(platform, uid);
                }
                return user;
            }
        }

        if (username) {
            let user = await this.getUserByUsername(username);
            if (user) {
                if (uid && !user.uid) {
                    await runAsync(this.db,
                        'UPDATE users SET uid = ? WHERE id = ?',
                        [uid, user.id]
                    );
                    console.log(`✅ Updated UID for ${username}`);
                }
                return user;
            }
        }

        if (!uid) {
            throw new Error('Cannot create user without UID');
        }

        const result = await runAsync(this.db,
            'INSERT INTO users (platform_id, uid) VALUES (?, ?)',
            [platformId, uid]
        );

        const userId = result.lastID;

        if (username) {
            await runAsync(this.db,
                'INSERT INTO username_history (user_id, username, profile_url, is_current) VALUES (?, ?, ?, 1)',
                [userId, username, profile_url || null]
            );
        }

        return await this.getUserByUid(platform, uid);
    }

    async updateUsername(userId, newUsername, profileUrl) {
        await runAsync(this.db,
            'UPDATE username_history SET is_current = 0 WHERE user_id = ?',
            [userId]
        );

        await runAsync(this.db,
            'INSERT INTO username_history (user_id, username, profile_url, is_current) VALUES (?, ?, ?, 1)',
            [userId, newUsername, profileUrl]
        );
    }

    async isMediaSaved(usernameOrUid, mediaId, platform = null) {
        let user;
        if (platform) {
            user = await this.getUserByUid(platform, usernameOrUid);
        } else {
            user = await this.getUserByUsername(usernameOrUid);
        }
        if (!user) return false;

        const result = await getAsync(this.db,
            'SELECT COUNT(*) as count FROM saved_media WHERE user_id = ? AND media_id = ?',
            [user.id, mediaId]
        );

        return result.count > 0;
    }

    async saveMedia(usernameOrUid, mediaId, platform = null) {
        let user;
        if (platform) {
            user = await this.getUserByUid(platform, usernameOrUid);
        } else {
            user = await this.getUserByUsername(usernameOrUid);
        }

        if (!user) {
            throw new Error(`User not found: ${usernameOrUid}`);
        }

        await runAsync(this.db,
            'INSERT OR IGNORE INTO saved_media (user_id, media_id) VALUES (?, ?)',
            [user.id, mediaId]
        );
    }

    async getSavedMediaByUser(usernameOrUid, platform = null) {
        let user;
        if (platform) {
            user = await this.getUserByUid(platform, usernameOrUid);
        } else {
            user = await this.getUserByUsername(usernameOrUid);
        }

        if (!user) return [];

        return await allAsync(this.db,
            `SELECT media_id, created_at
             FROM saved_media
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [user.id]
        );
    }

    async getCursor(usernameOrUid, apiName, platform = null) {
        let user;
        if (platform) {
            user = await this.getUserByUid(platform, usernameOrUid);
        } else {
            user = await this.getUserByUsername(usernameOrUid);
        }

        if (!user) return null;

        const result = await getAsync(this.db,
            `SELECT uc.cursor, uc.pages_loaded as pagesLoaded
             FROM user_cursors uc
             JOIN api_types a ON uc.api_type_id = a.id
             WHERE uc.user_id = ? AND a.name = ?`,
            [user.id, apiName]
        );

        return result || null;
    }

    async saveCursor(usernameOrUid, apiName, cursor, pagesLoaded = 0, platform = null) {
        let user;
        if (platform) {
            user = await this.getUserByUid(platform, usernameOrUid);
        } else {
            user = await this.getUserByUsername(usernameOrUid);
        }

        if (!user) {
            throw new Error(`User not found: ${usernameOrUid}`);
        }

        let apiType = await getAsync(this.db, 'SELECT id FROM api_types WHERE name = ?', [apiName]);
        if (!apiType) {
            const result = await runAsync(this.db, 'INSERT INTO api_types (name) VALUES (?)', [apiName]);
            apiType = { id: result.lastID };
        }

        await runAsync(this.db,
            `INSERT INTO user_cursors (user_id, api_type_id, cursor, pages_loaded)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, api_type_id)
             DO UPDATE SET cursor = ?, pages_loaded = ?, last_updated = CURRENT_TIMESTAMP`,
            [user.id, apiType.id, cursor, pagesLoaded, cursor, pagesLoaded]
        );
    }

    async saveReport(apiName, reportDetails, timestamp) {
        let apiType = await getAsync(this.db, 'SELECT id FROM api_types WHERE name = ?', [apiName]);
        if (!apiType) {
            const result = await runAsync(this.db, 'INSERT INTO api_types (name) VALUES (?)', [apiName]);
            apiType = { id: result.lastID };
        }

        const reportResult = await runAsync(this.db,
            'INSERT INTO api_reports (api_type_id, timestamp) VALUES (?, ?)',
            [apiType.id, timestamp]
        );

        const reportId = reportResult.lastID;

        for (const detail of reportDetails) {
            const user = await this.getUserByUsername(detail.username);
            if (!user) continue;

            const duration = this._parseDuration(detail.time);

            await runAsync(this.db,
                `INSERT INTO report_details
                 (report_id, user_id, url, total_items, items_saved, items_not_saved, duration, pages_fetched, media_ids)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [reportId, user.id, detail.url, detail.total, detail.have, detail.nohave, duration, detail.pages, JSON.stringify(detail.ids || [])]
            );
        }

        return reportId;
    }

    async getRecentReports(limit = 10) {
        return await allAsync(this.db,
            'SELECT * FROM v_recent_reports LIMIT ?',
            [limit]
        );
    }

    async getReportsByDateRange(startDate, endDate) {
        return await allAsync(this.db,
            `SELECT * FROM v_recent_reports
             WHERE timestamp BETWEEN ? AND ?
             ORDER BY timestamp DESC`,
            [startDate, endDate]
        );
    }

    async getMigrationProgress() {
        return await getAsync(this.db, 'SELECT * FROM v_migration_progress');
    }

    async getUsersNeedingMigration(limit = 100) {
        return await allAsync(this.db,
            'SELECT * FROM v_users_needing_migration LIMIT ?',
            [limit]
        );
    }

    async getMultipleCursors(apiName, usernames) {
        const placeholders = usernames.map(() => '?').join(',');
        const rows = await allAsync(this.db,
            `SELECT u.username, uc.cursor, uc.pages_loaded as pagesLoaded
             FROM user_cursors uc
             JOIN api_types a ON uc.api_type_id = a.id
             JOIN username_history uh ON uc.user_id = uh.user_id AND uh.is_current = 1
             JOIN users u ON uc.user_id = u.id
             WHERE a.name = ? AND uh.username IN (${placeholders})`,
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

    async batchSaveMedia(items) {
        let saved = 0;
        for (const item of items) {
            try {
                await this.saveMedia(item.username, item.mediaId, item.platform);
                saved++;
            } catch (err) {
                console.warn(`⚠️ Failed to save media for ${item.username}: ${err.message}`);
            }
        }
        return saved;
    }

    async getUserStats() {
        return await allAsync(this.db,
            'SELECT * FROM v_user_stats ORDER BY total_saved_media DESC'
        );
    }

    async getApiPerformance() {
        return await allAsync(this.db,
            'SELECT * FROM v_api_performance'
        );
    }

    _parseDuration(durationStr) {
        if (!durationStr) return 0;
        const parts = durationStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
}

let instance = null;

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
