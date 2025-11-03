/**
 * Database Query Routes - Users
 * Endpoints for user operations and bulk user fetching
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/db-v3');
const { getOrFetchUser, bulkFetchUsers } = require('../utils/userFetching');

/**
 * GET /api/db/users/stats
 * Get user statistics (media count, last download, etc.)
 */
router.get('/stats', async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        const stats = await db.getUserStats();

        if (!dbWasConnected) db.close();

        res.json({ users: stats, count: stats.length });
    } catch (err) {
        console.error('Error fetching user stats:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch user stats', message: err.message });
    }
});

/**
 * GET /api/db/users/:username
 * Get user by username
 */
router.get('/:username', async (req, res) => {
    const { username } = req.params;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        const user = await db.getUserByUsername(username);

        if (!dbWasConnected) db.close();

        if (user) {
            res.json({ user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Error fetching user:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch user', message: err.message });
    }
});

/**
 * GET /api/db/users/:platform/:uid
 * Get user by platform and UID
 */
router.get('/:platform/:uid', async (req, res) => {
    const { platform, uid } = req.params;

    if (!['facebook', 'instagram'].includes(platform)) {
        return res.status(400).json({ error: 'Invalid platform. Must be facebook or instagram' });
    }

    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        const user = await db.getUserByUid(platform, uid);

        if (!dbWasConnected) db.close();

        if (user) {
            res.json({ user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Error fetching user by UID:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch user', message: err.message });
    }
});

/**
 * POST /api/db/users/fetch
 * Auto-fetch user with UID from API
 * Body: { url, platform?, clientId }
 */
router.post('/fetch', async (req, res) => {
    const { url, platform, clientId } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Missing url' });
    }

    try {
        const user = await getOrFetchUser(url, platform || null, clientId);

        if (user) {
            res.json({ user, cached: !!user.uid });
        } else {
            res.status(404).json({ error: 'Could not fetch user' });
        }
    } catch (err) {
        console.error('Error fetching user:', err.message);
        res.status(500).json({ error: 'Failed to fetch user', message: err.message });
    }
});

/**
 * POST /api/db/users/bulk-fetch
 * Bulk fetch users with UIDs from API
 * Body: { urls: string[], clientId, concurrency? }
 */
router.post('/bulk-fetch', async (req, res) => {
    const { urls, clientId, concurrency } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Missing or invalid urls array' });
    }

    if (!clientId) {
        return res.status(400).json({ error: 'Missing clientId' });
    }

    try {
        const results = await bulkFetchUsers(urls, clientId, concurrency || 3);

        const successful = results.filter(r => r.user && !r.error);
        const failed = results.filter(r => r.error || !r.user);

        res.json({
            results,
            summary: {
                total: results.length,
                successful: successful.length,
                failed: failed.length
            }
        });
    } catch (err) {
        console.error('Error bulk fetching users:', err.message);
        res.status(500).json({ error: 'Failed to bulk fetch users', message: err.message });
    }
});

/**
 * GET /api/db/users/:username/media
 * Get saved media for user
 * Query params: ?limit=50
 */
router.get('/:username/media', async (req, res) => {
    const { username } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        const media = await db.getSavedMediaByUser(username);

        if (!dbWasConnected) db.close();

        // Apply limit
        const limitedMedia = media.slice(0, limit);

        res.json({
            media: limitedMedia,
            count: limitedMedia.length,
            total: media.length
        });
    } catch (err) {
        console.error('Error fetching user media:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch user media', message: err.message });
    }
});

/**
 * POST /api/db/users/search
 * Search users by username pattern
 * Body: { pattern: string, limit?: number }
 */
router.post('/search', async (req, res) => {
    const { pattern, limit } = req.body;

    if (!pattern) {
        return res.status(400).json({ error: 'Missing pattern' });
    }

    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        const query = `
            SELECT u.*, uh.username, uh.profile_url, p.platform_name
            FROM users u
            JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            JOIN platforms p ON u.platform_id = p.platform_id
            WHERE uh.username LIKE ?
            LIMIT ?
        `;

        const users = await new Promise((resolve, reject) => {
            db.db.all(query, [`%${pattern}%`, limit || 50], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!dbWasConnected) db.close();

        res.json({ users, count: users.length });
    } catch (err) {
        console.error('Error searching users:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to search users', message: err.message });
    }
});

module.exports = router;
