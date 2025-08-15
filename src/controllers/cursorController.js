const { readLastCursors, writeLastCursors } = require('../utils/fileUtils');

// POST /get-last-cursors { apiName, usernames }
const getLastCursors = (req, res) => {
    const { apiName, usernames } = req.body;
    if (!apiName || !Array.isArray(usernames)) {
        return res.status(400).json({ error: 'Missing apiName or usernames' });
    }
    const allCursors = readLastCursors();
    const apiCursors = allCursors[apiName] || {};
    const lastCursors = {};
    for (const username of usernames) {
        // Return both cursor and pagesLoaded (default to '' and 0)
        const entry = apiCursors[username] || {};
        lastCursors[username] = {
            cursor: entry.cursor || '',
            pagesLoaded: entry.pagesLoaded || 0
        };
    }
    res.json({ lastCursors });
};

// POST /save-last-cursor { apiName, username, cursor, pagesLoaded }
const saveLastCursor = (req, res) => {
    const { apiName, username, cursor, pagesLoaded } = req.body;
    if (!apiName || !username || !cursor) {
        return res.status(400).json({ error: 'Missing apiName, username, or cursor' });
    }
    const allCursors = readLastCursors();
    if (!allCursors[apiName]) allCursors[apiName] = {};
    allCursors[apiName][username] = {
        cursor,
        pagesLoaded: pagesLoaded || 0
    };
    writeLastCursors(allCursors);
    res.json({ message: 'Last cursor and pagesLoaded saved.' });
};

module.exports = {
    getLastCursors,
    saveLastCursor,
};
