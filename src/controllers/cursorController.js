const { readLastCursors, writeLastCursors } = require('../utils/fileUtils');
const { getDatabase } = require('../../database/db-v2');

// POST /get-last-cursors { apiName, usernames }
const getLastCursors = async (req, res) => {
    const { apiName, usernames } = req.body;
    if (!apiName || !Array.isArray(usernames)) {
        return res.status(400).json({ error: 'Missing apiName or usernames' });
    }

    const lastCursors = {};

    // Try database first
    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        for (const username of usernames) {
            try {
                const cursorData = await db.getCursor(username, apiName);
                if (cursorData) {
                    lastCursors[username] = {
                        cursor: cursorData.cursor || '',
                        pagesLoaded: cursorData.pagesLoaded || 0
                    };
                    console.log(`📚 Retrieved cursor from database for ${username}`);
                }
            } catch (err) {
                console.warn(`⚠️  Error retrieving cursor for ${username}:`, err.message);
            }
        }

        if (!dbWasConnected) db.close();
    } catch (err) {
        if (!dbWasConnected && db.db) db.close();
        console.warn('⚠️  Database connection failed, falling back to file-based cursors:', err.message);
    }

    // Fall back to file-based cursors for any missing
    const allCursors = await readLastCursors();
    const apiCursors = allCursors[apiName] || {};

    for (const username of usernames) {
        if (!lastCursors[username]) {
            // Not found in database, check files
            const entry = apiCursors[username] || {};
            lastCursors[username] = {
                cursor: entry.cursor || '',
                pagesLoaded: entry.pagesLoaded || 0
            };
            console.log(`📄 Retrieved cursor from file for ${username}`);
        }
    }

    res.json({ lastCursors });
};

// POST /save-last-cursor { apiName, username, cursor, pagesLoaded }
const saveLastCursor = async (req, res) => {
    const { apiName, username, cursor, pagesLoaded } = req.body;
    if (!apiName || !username || !cursor) {
        return res.status(400).json({ error: 'Missing apiName, username, or cursor' });
    }

    // Save to DATABASE (new)
    const db = getDatabase();
    let dbWasConnected = db.db !== null;
    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        await db.saveCursor(username, apiName, cursor, pagesLoaded || 0);
        console.log(`💾 Saved cursor to database for ${username}`);

        if (!dbWasConnected) db.close();
    } catch (err) {
        console.warn('⚠️  Error saving to database, falling back to file-only:', err.message);
        if (!dbWasConnected && db.db) db.close();
    }

    // Save to FILE (old - parallel write during transition)
    const allCursors = await readLastCursors();
    if (!allCursors[apiName]) allCursors[apiName] = {};
    allCursors[apiName][username] = {
        cursor,
        pagesLoaded: pagesLoaded || 0
    };
    await writeLastCursors(allCursors);
    console.log(`📄 Saved cursor to file for ${username}`);

    res.json({ message: 'Last cursor and pagesLoaded saved.' });
};

module.exports = {
    getLastCursors,
    saveLastCursor,
};
