const fs = require('fs');
const path = require('path');
const { readSavedList } = require('../utils/fileUtils');

// Helper function to check if file exists (async)
async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Endpoint to check saved images
const checkSaved = async (req, res) => {
    const { username, ids } = req.body;
    if (!username || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Missing username or ids' });
    }
    // Ensure username is sanitized
    const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    const imageDir = path.join(process.cwd(), 'result', safeUsername, 'image');
    const videoDir = path.join(process.cwd(), 'result', safeUsername, 'video');

    let savedIds = [];
    for (const id of ids) {
        // Check common extensions
        const exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4'];
        let found = false;
        for (const ext of exts) {
            const filePath = path.join(imageDir, `${id}.${ext}`);
            // Check in the image directory
            if (await fileExists(filePath)) {
                savedIds.push(id);
                found = true;
                break;
            }
            // If not found in image, check in video (only for mp4)
            if (!found && ext === 'mp4') {
                const videoPath = path.join(videoDir, `${id}.${ext}`);
                if (await fileExists(videoPath)) {
                    savedIds.push(id);
                    found = true;
                    break;
                }
            }
        }
    }
    res.json({ saved: savedIds });
};

// Endpoint to return the list of saved images
const getSavedList = async (req, res) => {
    const list = await readSavedList();
    res.json({ list });
};

module.exports = {
    checkSaved,
    getSavedList,
};
