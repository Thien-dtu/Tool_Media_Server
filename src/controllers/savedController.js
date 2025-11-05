const fs = require('fs');
const path = require('path');
// const { readSavedList } = require('../utils/fileUtils');
const { getDatabase } = require('../../database/db-v3');
const { getOrFetchUser } = require('../utils/userFetching');

// Helper function to check if file exists (async)
async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Endpoint to check saved images : OLD
// const checkSaved = async (req, res) => {
//     const { username, ids } = req.body;
//     if (!username || !Array.isArray(ids)) {
//         return res.status(400).json({ error: 'Missing username or ids' });
//     }
//     // Ensure username is sanitized
//     const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
//     const imageDir = path.join(process.cwd(), 'result', safeUsername, 'image');
//     const videoDir = path.join(process.cwd(), 'result', safeUsername, 'video');

//     let savedIds = [];
//     for (const id of ids) {
//         // Check common extensions
//         const exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4'];
//         let found = false;
//         for (const ext of exts) {
//             const filePath = path.join(imageDir, `${id}.${ext}`);
//             // Check in the image directory
//             if (await fileExists(filePath)) {
//                 savedIds.push(id);
//                 found = true;
//                 break;
//             }
//             // If not found in image, check in video (only for mp4)
//             if (!found && ext === 'mp4') {
//                 const videoPath = path.join(videoDir, `${id}.${ext}`);
//                 if (await fileExists(videoPath)) {
//                     savedIds.push(id);
//                     found = true;
//                     break;
//                 }
//             }
//         }
//     }
//     res.json({ saved: savedIds });
// };

// Endpoint to check saved images: NEW (database-only, file is backup)
const checkSaved = async (req, res) => {
    const { username, ids } = req.body;
    if (!username || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Missing username or ids' });
    }

    if (ids.length === 0) {
        return res.json({ saved: [] });
    }

    const db = getDatabase();
    try {
        // Ensure connection (persistent singleton pattern)
        if (!db.db) {
            await db.connect();
        }

        // 1. Find user_id from username
        const user = await db.getUserByUsername(username);

        if (!user || !user.id) {
            // If user not found, definitely no saved media
            return res.json({ saved: [] });
        }

        // 2. Create SQL placeholders (e.g., ?,?,?)
        const placeholders = ids.map(() => '?').join(',');

        // 3. Execute single SQL query
        const sql = `
            SELECT media_id
            FROM saved_media
            WHERE user_id = ? AND media_id IN (${placeholders})
        `;

        const params = [user.id, ...ids];

        const rows = await new Promise((resolve, reject) => {
            db.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // 4. Return array of found IDs
        const savedIds = rows.map(row => row.media_id);
        res.json({ saved: savedIds });

    } catch (err) {
        console.error('Error in /check-saved:', err.message);
        res.status(500).json({ error: 'Server error while checking saved media' });
    }
};

// Endpoint to return the list of saved images: OLD
// const getSavedList = async (req, res) => {
//     const list = await readSavedList();
//     res.json({ list });
// };

// Endpoint to return the list of saved images: NEW
const getSavedList = async (req, res) => {
    const db = getDatabase();
    try {
        // Ensure connection (persistent singleton pattern)
        if (!db.db) {
            await db.connect();
        }

        // Query database for all saved media
        const list = await new Promise((resolve, reject) => {
            const sql = `
                SELECT uh.username, sm.media_id as id
                FROM saved_media sm
                JOIN users u ON sm.user_id = u.id
                JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
            `;
            db.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json({ list });

    } catch (err) {
        console.error('Error fetching saved list from DB:', err.message);
        res.status(500).json({ list: [] });
    }
};


module.exports = {
    checkSaved,
    getSavedList,
};
