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
 * Query params: ?limit=10
 */
router.get('/recent', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const db = getDatabase();
    try {
        await db.connect();
        const reports = await db.getRecentReports(limit);
        db.close();

        res.json({ reports });
    } catch (err) {
        console.error('Error fetching recent reports:', err.message);
        if (db.db) db.close();
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
    try {
        await db.connect();
        const reports = await db.getReportsByDateRange(startDate, endDate);
        db.close();

        res.json({ reports, count: reports.length });
    } catch (err) {
        console.error('Error fetching reports by date range:', err.message);
        if (db.db) db.close();
        res.status(500).json({ error: 'Failed to fetch reports', message: err.message });
    }
});

/**
 * GET /api/db/reports/stats
 * Get API performance statistics
 */
router.get('/stats', async (req, res) => {
    const db = getDatabase();
    try {
        await db.connect();
        const stats = await db.getApiPerformance();
        db.close();

        res.json({ stats });
    } catch (err) {
        console.error('Error fetching API stats:', err.message);
        if (db.db) db.close();
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
            JOIN report_details rd ON ar.id = rd.report_id
            JOIN users u ON rd.user_id = u.id
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

        const reports = await new Promise((resolve, reject) => {
            db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();

        res.json({ reports, count: reports.length });
    } catch (err) {
        console.error('Error executing custom report query:', err.message);
        if (db.db) db.close();
        res.status(500).json({ error: 'Failed to execute query', message: err.message });
    }
});

module.exports = router;
