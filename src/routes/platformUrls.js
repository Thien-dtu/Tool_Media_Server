/**
 * Platform URLs Route
 * Endpoint for fetching profile URLs grouped by platform
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/db-v3');

/**
 * GET /api/db/platform-urls/:platform
 * Get all profile URLs for a specific platform (facebook or instagram)
 */
router.get('/:platform', async (req, res) => {
    const { platform } = req.params;

    if (!['facebook', 'instagram'].includes(platform)) {
        return res.status(400).json({ error: 'Invalid platform. Must be facebook or instagram' });
    }

    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        // Query to get all profile URLs for the specified platform
        const query = `
            SELECT
                uh.profile_url,
                uh.username,
                u.uid
            FROM username_history uh
            JOIN users u ON uh.user_id = u.id
            JOIN platforms p ON u.platform_id = p.platform_id
            WHERE p.platform_name = ?
                AND uh.is_current = 1
                AND uh.profile_url IS NOT NULL
            ORDER BY uh.username ASC
        `;

        const rows = await new Promise((resolve, reject) => {
            db.db.all(query, [platform], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!dbWasConnected) db.close();

        // Extract just the URLs for easy copying
        const urls = rows.map(row => row.profile_url);

        res.json({
            platform,
            count: urls.length,
            urls,
            details: rows // Include username and uid for reference
        });
    } catch (err) {
        console.error('Error fetching platform URLs:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch platform URLs', message: err.message });
    }
});

/**
 * GET /api/db/platform-urls
 * Get all profile URLs grouped by platform
 */
router.get('/', async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        // Query to get all profile URLs grouped by platform
        const query = `
            SELECT
                p.platform_name,
                uh.profile_url,
                uh.username,
                u.uid
            FROM username_history uh
            JOIN users u ON uh.user_id = u.id
            JOIN platforms p ON u.platform_id = p.platform_id
            WHERE uh.is_current = 1
                AND uh.profile_url IS NOT NULL
            ORDER BY p.platform_name, uh.username ASC
        `;

        const rows = await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!dbWasConnected) db.close();

        // Group by platform
        const grouped = rows.reduce((acc, row) => {
            if (!acc[row.platform_name]) {
                acc[row.platform_name] = [];
            }
            acc[row.platform_name].push(row);
            return acc;
        }, {});

        const result = Object.entries(grouped).map(([platform, items]) => ({
            platform,
            count: items.length,
            urls: items.map(item => item.profile_url),
            details: items
        }));

        res.json({
            platforms: result,
            total: rows.length
        });
    } catch (err) {
        console.error('Error fetching all platform URLs:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch platform URLs', message: err.message });
    }
});

module.exports = router;
