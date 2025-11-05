const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/db-v3');

// GET /diagnostics/saved-media/:username - Check saved media status
router.get('/diagnostics/saved-media/:username', async (req, res) => {
    const { username } = req.params;
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        // Check if user exists
        const user = await db.getUserByUsername(username);

        if (!user) {
            if (!dbWasConnected) db.close();
            return res.json({
                status: 'user_not_found',
                username,
                message: 'User not found in database',
                savedMedia: []
            });
        }

        // Get saved media
        const savedMedia = await db.getSavedMediaByUser(username);

        if (!dbWasConnected) db.close();

        res.json({
            status: 'success',
            username,
            user: {
                id: user.id,
                uid: user.uid,
                platform: user.platform_name,
                hasUid: !!user.uid
            },
            savedMediaCount: savedMedia.length,
            savedMedia: savedMedia.slice(0, 10) // First 10 items
        });

    } catch (err) {
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
});

// GET /diagnostics/db-status - Check database connection
router.get('/diagnostics/db-status', async (req, res) => {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        // Get table counts
        const userCount = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        const savedMediaCount = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM saved_media', [], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        if (!dbWasConnected) db.close();

        res.json({
            status: 'connected',
            database: 'social_media.db',
            tables: {
                users: userCount,
                saved_media: savedMediaCount
            }
        });

    } catch (err) {
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
});

// POST /diagnostics/migrate-saved-files - Migrate saved_images.json to database
router.post('/diagnostics/migrate-saved-files', async (req, res) => {
    const { readSavedList } = require('../utils/fileUtils');
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        const savedList = await readSavedList();
        console.log(`📄 Found ${savedList.length} items in saved_images.json`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const item of savedList) {
            const { username, id: mediaId } = item;

            if (!username || !mediaId) {
                skipped++;
                continue;
            }

            try {
                const user = await db.getUserByUsername(username);

                if (!user) {
                    skipped++;
                    continue;
                }

                const alreadySaved = await db.isMediaSaved(username, mediaId);

                if (alreadySaved) {
                    skipped++;
                    continue;
                }

                await db.saveMedia(username, mediaId);
                migrated++;

            } catch (err) {
                console.error(`Error migrating ${mediaId} for ${username}:`, err.message);
                errors++;
            }
        }

        if (!dbWasConnected) db.close();

        res.json({
            status: 'success',
            summary: {
                total: savedList.length,
                migrated,
                skipped,
                errors
            }
        });

    } catch (err) {
        if (!dbWasConnected && db.db) db.close();
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
});

module.exports = router;
