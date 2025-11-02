/**
 * Database Query Routes - Reports
 * Endpoints for querying report data from database
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/db-v2');

/**
 * GET /api/db/reports/recent
 * Get recent API reports
 * Query params: ?limit=100
 */
router.get('/recent', async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();
        const flatReports = await db.getRecentReports(limit * 10); // Get more rows to ensure we have enough grouped reports
        if (!dbWasConnected) db.close();

        // Group flattened data by report_id to create nested structure
        const grouped = {};
        flatReports.forEach(row => {
            const key = row.report_id;
            if (!grouped[key]) {
                grouped[key] = {
                    apiName: row.api_name,
                    timestamp: row.timestamp,
                    report: []
                };
            }
            grouped[key].report.push({
                username: row.username,
                url: row.url || '',
                total: row.total_items || 0,
                have: row.saved_items || 0,
                nohave: (row.total_items || 0) - (row.saved_items || 0),
                ids: (() => {
                    try { return row.media_ids ? JSON.parse(row.media_ids) : []; }
                    catch { return []; }
                })(),
                time: row.duration || '',
                pages: row.pages_loaded || 0
            });
        });

        const reports = Object.values(grouped).slice(0, limit);
        res.json({ reports });
    } catch (err) {
        console.error('Error fetching recent reports:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch reports', message: err.message });
    }
});

/**
 * GET /api/db/reports/date-range
 * Get reports by date range
 * Query params: ?startDate=2025-01-01&endDate=2025-01-31
 */
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Missing startDate or endDate query parameters' });
    }

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();
        const flatReports = await db.getReportsByDateRange(startDate, endDate);
        if (!dbWasConnected) db.close();

        // Group flattened data by report_id to create nested structure
        const grouped = {};
        flatReports.forEach(row => {
            const key = row.report_id;
            if (!grouped[key]) {
                grouped[key] = {
                    apiName: row.api_name,
                    timestamp: row.timestamp,
                    report: []
                };
            }
            grouped[key].report.push({
                username: row.username,
                url: row.url || '',
                total: row.total_items || 0,
                have: row.saved_items || 0,
                nohave: (row.total_items || 0) - (row.saved_items || 0),
                ids: (() => {
                    try { return row.media_ids ? JSON.parse(row.media_ids) : []; }
                    catch { return []; }
                })(),
                time: row.duration || '',
                pages: row.pages_loaded || 0
            });
        });

        const reports = Object.values(grouped);
        res.json({ reports, count: reports.length });
    } catch (err) {
        console.error('Error fetching reports by date range:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch reports', message: err.message });
    }
});

/**
 * GET /api/db/reports/stats
 * Get API performance statistics
 */
router.get('/stats', async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();
        const stats = await db.getApiPerformance();
        if (!dbWasConnected) db.close();

        res.json({ stats });
    } catch (err) {
        console.error('Error fetching API stats:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch stats', message: err.message });
    }
});

/**
 * POST /api/db/reports/query
 * Custom report query with filters
 * Body: { apiName, username, startDate, endDate, limit }
 */
router.post('/query', async (req, res) => {
    const { apiName, username, startDate, endDate, limit } = req.body;

    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        await db.connect();

        // Build dynamic query based on filters
        let query = `
            SELECT
                ar.id,
                ar.timestamp,
                at.name as api_name,
                rd.user_id,
                uh.username,
                rd.url,
                rd.total_items,
                rd.items_saved,
                rd.items_not_saved,
                rd.duration,
                rd.pages_fetched,
                rd.media_ids
            FROM api_reports ar
            JOIN api_types at ON ar.api_type_id = at.id
            LEFT JOIN report_details rd ON ar.id = rd.report_id
            LEFT JOIN users u ON rd.user_id = u.id
            LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            WHERE 1=1
        `;
        const params = [];

        if (apiName) {
            query += ` AND at.name = ?`;
            params.push(apiName);
        }

        if (username) {
            query += ` AND uh.username = ?`;
            params.push(username);
        }

        if (startDate && endDate) {
            query += ` AND ar.timestamp BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY ar.timestamp DESC`;

        if (limit) {
            query += ` LIMIT ?`;
            params.push(parseInt(limit));
        }

        const flatReports = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!dbWasConnected) db.close();

        // Group flattened data by report id to create nested structure
        const grouped = {};
        flatReports.forEach(row => {
            const key = row.id;
            if (!grouped[key]) {
                grouped[key] = {
                    apiName: row.api_name,
                    timestamp: row.timestamp,
                    report: []
                };
            }
            grouped[key].report.push({
                username: row.username,
                url: row.url || '',
                total: row.total_items || 0,
                have: row.items_saved || 0,
                nohave: row.items_not_saved || 0,
                ids: (() => {
                    try { return row.media_ids ? JSON.parse(row.media_ids) : []; }
                    catch { return []; }
                })(),
                time: row.duration || '',
                pages: row.pages_fetched || 0
            });
        });

        const reports = Object.values(grouped);
        res.json({ reports, count: reports.length });
    } catch (err) {
        console.error('Error executing custom report query:', err.message);
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({ error: 'Failed to execute query', message: err.message });
    }
});

module.exports = router;
