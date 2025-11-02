/**
 * Analytics Routes
 * Advanced analytics endpoints for comprehensive reporting
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/db-v2');

// ============================================================
// USER ANALYTICS
// ============================================================

/**
 * GET /api/db/analytics/top-users
 * Get most active users by download count
 * Query params: ?limit=10&startDate=&endDate=
 */
router.get('/top-users', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const { startDate, endDate } = req.query;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        let query = `
            SELECT
                u.id,
                u.uid,
                uh.username,
                p.platform_name,
                COUNT(DISTINCT sm.id) as total_downloads,
                COUNT(DISTINCT rd.report_id) as api_calls,
                MAX(sm.created_at) as last_download
            FROM users u
            JOIN platforms p ON u.platform_id = p.platform_id
            LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            LEFT JOIN saved_media sm ON u.id = sm.user_id
            LEFT JOIN report_details rd ON u.id = rd.user_id
        `;

        const params = [];
        if (startDate && endDate) {
            query += ` WHERE sm.created_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += `
            GROUP BY u.id, u.uid, uh.username, p.platform_name
            HAVING total_downloads > 0
            ORDER BY total_downloads DESC
            LIMIT ?
        `;
        params.push(limit);

        const users = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ users, count: users.length });
    } catch (err) {
        console.error('Error fetching top users:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch top users', message: err.message });
    }
});

/**
 * GET /api/db/analytics/inactive-users
 * Get users with no activity in specified days
 * Query params: ?days=30
 */
router.get('/inactive-users', async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days) : 30;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffISO = cutoffDate.toISOString();

        const query = `
            SELECT
                u.id,
                u.uid,
                uh.username,
                p.platform_name,
                MAX(sm.created_at) as last_download,
                COUNT(DISTINCT sm.id) as total_downloads
            FROM users u
            JOIN platforms p ON u.platform_id = p.platform_id
            LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            LEFT JOIN saved_media sm ON u.id = sm.user_id
            GROUP BY u.id, u.uid, uh.username, p.platform_name
            HAVING last_download IS NULL OR last_download < ?
            ORDER BY last_download DESC
        `;

        const users = await new Promise((resolve, reject) => {
            db.db.all(query, [cutoffISO], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ users, count: users.length, inactiveDays: days });
    } catch (err) {
        console.error('Error fetching inactive users:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch inactive users', message: err.message });
    }
});

/**
 * GET /api/db/analytics/user-engagement
 * Get user engagement scores
 * Query params: ?minScore=0
 */
router.get('/user-engagement', async (req, res) => {
    const minScore = req.query.minScore ? parseFloat(req.query.minScore) : 0;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        const query = `
            SELECT
                u.id,
                u.uid,
                uh.username,
                p.platform_name,
                COUNT(DISTINCT sm.id) as total_downloads,
                COUNT(DISTINCT rd.report_id) as total_api_calls,
                COUNT(DISTINCT DATE(sm.created_at)) as active_days,
                MAX(sm.created_at) as last_activity,
                (COUNT(DISTINCT sm.id) * 1.0 + COUNT(DISTINCT rd.report_id) * 2.0 + COUNT(DISTINCT DATE(sm.created_at)) * 3.0) as engagement_score
            FROM users u
            JOIN platforms p ON u.platform_id = p.platform_id
            LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            LEFT JOIN saved_media sm ON u.id = sm.user_id
            LEFT JOIN report_details rd ON u.id = rd.user_id
            GROUP BY u.id, u.uid, uh.username, p.platform_name
            HAVING engagement_score >= ?
            ORDER BY engagement_score DESC
        `;

        const users = await new Promise((resolve, reject) => {
            db.db.all(query, [minScore], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ users, count: users.length });
    } catch (err) {
        console.error('Error fetching user engagement:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch user engagement', message: err.message });
    }
});

// ============================================================
// TIMELINE & TRENDS
// ============================================================

/**
 * GET /api/db/analytics/download-timeline
 * Get download activity over time
 * Query params: ?startDate=&endDate=&granularity=day
 */
router.get('/download-timeline', async (req, res) => {
    const { startDate, endDate } = req.query;
    const granularity = req.query.granularity || 'day'; // day, week, month

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        let dateFormat;
        switch (granularity) {
            case 'week':
                dateFormat = `strftime('%Y-W%W', created_at)`;
                break;
            case 'month':
                dateFormat = `strftime('%Y-%m', created_at)`;
                break;
            default:
                dateFormat = `DATE(created_at)`;
        }

        let query = `
            SELECT
                ${dateFormat} as period,
                COUNT(*) as download_count,
                COUNT(DISTINCT user_id) as unique_users
            FROM saved_media
        `;

        const params = [];
        if (startDate && endDate) {
            query += ` WHERE created_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += `
            GROUP BY period
            ORDER BY period ASC
        `;

        const timeline = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ timeline, granularity });
    } catch (err) {
        console.error('Error fetching download timeline:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch download timeline', message: err.message });
    }
});

/**
 * GET /api/db/analytics/api-frequency
 * Get API call frequency over time
 * Query params: ?startDate=&endDate=&granularity=day
 */
router.get('/api-frequency', async (req, res) => {
    const { startDate, endDate } = req.query;
    const granularity = req.query.granularity || 'day';

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        let dateFormat;
        switch (granularity) {
            case 'week':
                dateFormat = `strftime('%Y-W%W', ar.timestamp)`;
                break;
            case 'month':
                dateFormat = `strftime('%Y-%m', ar.timestamp)`;
                break;
            default:
                dateFormat = `DATE(ar.timestamp)`;
        }

        let query = `
            SELECT
                ${dateFormat} as period,
                at.name as api_name,
                COUNT(DISTINCT ar.id) as call_count
            FROM api_reports ar
            JOIN api_types at ON ar.api_type_id = at.id
        `;

        const params = [];
        if (startDate && endDate) {
            query += ` WHERE ar.timestamp BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += `
            GROUP BY period, api_name
            ORDER BY period ASC, api_name
        `;

        const frequency = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ frequency, granularity });
    } catch (err) {
        console.error('Error fetching API frequency:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch API frequency', message: err.message });
    }
});

/**
 * GET /api/db/analytics/completion-trends
 * Get download completion rates over time
 * Query params: ?startDate=&endDate=&apiName=
 */
router.get('/completion-trends', async (req, res) => {
    const { startDate, endDate, apiName } = req.query;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        let query = `
            SELECT
                DATE(ar.timestamp) as date,
                at.name as api_name,
                SUM(rd.total_items) as total_items,
                SUM(rd.items_saved) as items_saved,
                CASE
                    WHEN SUM(rd.total_items) > 0
                    THEN (SUM(rd.items_saved) * 100.0 / SUM(rd.total_items))
                    ELSE 0
                END as completion_rate
            FROM api_reports ar
            JOIN api_types at ON ar.api_type_id = at.id
            JOIN report_details rd ON ar.id = rd.report_id
            WHERE 1=1
        `;

        const params = [];
        if (startDate && endDate) {
            query += ` AND ar.timestamp BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }
        if (apiName) {
            query += ` AND at.name = ?`;
            params.push(apiName);
        }

        query += `
            GROUP BY date, api_name
            ORDER BY date ASC
        `;

        const trends = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ trends });
    } catch (err) {
        console.error('Error fetching completion trends:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch completion trends', message: err.message });
    }
});

// ============================================================
// CONTENT ANALYTICS
// ============================================================

/**
 * GET /api/db/analytics/media-deduplication
 * Get most downloaded media items
 * Query params: ?limit=20
 */
router.get('/media-deduplication', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        const query = `
            SELECT
                media_id,
                COUNT(DISTINCT user_id) as user_count,
                COUNT(*) as download_count,
                MIN(created_at) as first_download,
                MAX(created_at) as last_download
            FROM saved_media
            GROUP BY media_id
            HAVING user_count > 1
            ORDER BY user_count DESC, download_count DESC
            LIMIT ?
        `;

        const media = await new Promise((resolve, reject) => {
            db.db.all(query, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ media, count: media.length });
    } catch (err) {
        console.error('Error fetching media deduplication:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch media deduplication', message: err.message });
    }
});

/**
 * GET /api/db/analytics/completion-by-api
 * Get download completion rates by API
 */
router.get('/completion-by-api', async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        const query = `
            SELECT
                at.name as api_name,
                COUNT(DISTINCT ar.id) as total_reports,
                SUM(rd.total_items) as total_items,
                SUM(rd.items_saved) as items_saved,
                SUM(rd.items_not_saved) as items_not_saved,
                CASE
                    WHEN SUM(rd.total_items) > 0
                    THEN (SUM(rd.items_saved) * 100.0 / SUM(rd.total_items))
                    ELSE 0
                END as completion_rate
            FROM api_types at
            JOIN api_reports ar ON at.id = ar.api_type_id
            JOIN report_details rd ON ar.id = rd.report_id
            GROUP BY at.name
            ORDER BY completion_rate DESC
        `;

        const rates = await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ rates });
    } catch (err) {
        console.error('Error fetching completion by API:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch completion by API', message: err.message });
    }
});

// ============================================================
// USER TRACKING
// ============================================================

/**
 * GET /api/db/analytics/username-changes
 * Get username change history
 * Query params: ?username=&limit=50
 */
router.get('/username-changes', async (req, res) => {
    const { username } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        let query = `
            SELECT
                u.uid,
                p.platform_name,
                uh.username,
                uh.changed_at,
                uh.is_current
            FROM username_history uh
            JOIN users u ON uh.user_id = u.id
            JOIN platforms p ON u.platform_id = p.platform_id
            WHERE uh.user_id IN (
                SELECT user_id
                FROM username_history
                GROUP BY user_id
                HAVING COUNT(*) > 1
            )
        `;

        const params = [];
        if (username) {
            query += ` WHERE u.id IN (
                SELECT user_id FROM username_history WHERE username LIKE ?
            )`;
            params.push(`%${username}%`);
        }

        query += ` ORDER BY uh.changed_at DESC LIMIT ?`;
        params.push(limit);

        const changes = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ changes, count: changes.length });
    } catch (err) {
        console.error('Error fetching username changes:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch username changes', message: err.message });
    }
});

/**
 * GET /api/db/analytics/duplicate-usernames
 * Find usernames shared across multiple UIDs
 */
router.get('/duplicate-usernames', async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        const query = `
            SELECT
                uh.username,
                COUNT(DISTINCT u.uid) as uid_count,
                GROUP_CONCAT(DISTINCT u.uid) as uids,
                GROUP_CONCAT(DISTINCT p.platform_name) as platforms
            FROM username_history uh
            JOIN users u ON uh.user_id = u.id
            JOIN platforms p ON u.platform_id = p.platform_id
            WHERE uh.is_current = 1
            GROUP BY uh.username
            HAVING uid_count > 1
            ORDER BY uid_count DESC
        `;

        const duplicates = await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ duplicates, count: duplicates.length });
    } catch (err) {
        console.error('Error fetching duplicate usernames:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch duplicate usernames', message: err.message });
    }
});

/**
 * GET /api/db/analytics/cursor-progress
 * Get active cursors and progress
 * Query params: ?username=
 */
router.get('/cursor-progress', async (req, res) => {
    const { username } = req.query;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        let query = `
            SELECT
                u.uid,
                uh.username,
                p.platform_name,
                at.name as api_name,
                uc.pages_loaded,
                uc.last_updated,
                uc.cursor
            FROM user_cursors uc
            JOIN users u ON uc.user_id = u.id
            JOIN platforms p ON u.platform_id = p.platform_id
            LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            JOIN api_types at ON uc.api_type_id = at.id
        `;

        const params = [];
        if (username) {
            query += ` WHERE uh.username LIKE ?`;
            params.push(`%${username}%`);
        }

        query += ` ORDER BY uc.last_updated DESC`;

        const cursors = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ cursors, count: cursors.length });
    } catch (err) {
        console.error('Error fetching cursor progress:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch cursor progress', message: err.message });
    }
});

// ============================================================
// PLATFORM & COHORT ANALYSIS
// ============================================================

/**
 * GET /api/db/analytics/platform-comparison
 * Compare activity across platforms
 */
router.get('/platform-comparison', async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        const query = `
            SELECT
                p.platform_name,
                COUNT(DISTINCT u.id) as total_users,
                COUNT(DISTINCT sm.id) as total_downloads,
                COUNT(DISTINCT rd.report_id) as total_api_calls,
                MAX(sm.created_at) as last_activity
            FROM platforms p
            LEFT JOIN users u ON p.platform_id = u.platform_id
            LEFT JOIN saved_media sm ON u.id = sm.user_id
            LEFT JOIN report_details rd ON u.id = rd.user_id
            GROUP BY p.platform_name
            ORDER BY total_downloads DESC
        `;

        const platforms = await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ platforms });
    } catch (err) {
        console.error('Error fetching platform comparison:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch platform comparison', message: err.message });
    }
});

/**
 * GET /api/db/analytics/cohort-analysis
 * Analyze user cohorts by signup period
 * Query params: ?period=month
 */
router.get('/cohort-analysis', async (req, res) => {
    const period = req.query.period || 'month'; // week, month

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        let dateFormat;
        if (period === 'week') {
            dateFormat = `strftime('%Y-W%W', u.created_at)`;
        } else {
            dateFormat = `strftime('%Y-%m', u.created_at)`;
        }

        const query = `
            SELECT
                ${dateFormat} as cohort,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT sm.id) as total_downloads,
                AVG(user_downloads.download_count) as avg_downloads_per_user,
                MAX(sm.created_at) as last_activity
            FROM users u
            LEFT JOIN saved_media sm ON u.id = sm.user_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as download_count
                FROM saved_media
                GROUP BY user_id
            ) user_downloads ON u.id = user_downloads.user_id
            GROUP BY cohort
            ORDER BY cohort DESC
        `;

        const cohorts = await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        //if (!dbWasConnected) db.close();
        res.json({ cohorts, period });
    } catch (err) {
        console.error('Error fetching cohort analysis:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch cohort analysis', message: err.message });
    }
});

/**
 * GET /api/db/analytics/summary-dashboard
 * Get comprehensive summary statistics
 * Query params: ?startDate=&endDate=
 */
router.get('/summary-dashboard', async (req, res) => {
    const { startDate, endDate } = req.query;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        // Build date filter
        let dateFilter = '';
        const params = [];
        if (startDate && endDate) {
            dateFilter = 'WHERE created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Total users
        const totalUsers = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Total downloads
        const totalDownloads = await new Promise((resolve, reject) => {
            db.db.get(`SELECT COUNT(*) as count FROM saved_media ${dateFilter}`, params, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Total API calls
        const reportParams = startDate && endDate ? [startDate, endDate] : [];
        const reportFilter = startDate && endDate ? 'WHERE timestamp BETWEEN ? AND ?' : '';
        const totalApiCalls = await new Promise((resolve, reject) => {
            db.db.get(`SELECT COUNT(*) as count FROM api_reports ${reportFilter}`, reportParams, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Active users (with downloads)
        const activeUsers = await new Promise((resolve, reject) => {
            db.db.get(`SELECT COUNT(DISTINCT user_id) as count FROM saved_media ${dateFilter}`, params, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentDownloads = await new Promise((resolve, reject) => {
            db.db.get(
                'SELECT COUNT(*) as count FROM saved_media WHERE created_at >= ?',
                [sevenDaysAgo.toISOString()],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        const summary = {
            totalUsers,
            totalDownloads,
            totalApiCalls,
            activeUsers,
            recentDownloads,
            dateRange: startDate && endDate ? { startDate, endDate } : null
        };

        //if (!dbWasConnected) db.close();
        res.json({ summary });
    } catch (err) {
        console.error('Error fetching summary dashboard:', err.message);
        //if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch summary dashboard', message: err.message });
    }
});

module.exports = router;
