const fs = require('fs');
const path = require('path');
const { readSavedList } = require('../utils/fileUtils');

// Endpoint to check saved images
const checkSaved = async (req, res) => {
    const { username, ids } = req.body;
    if (!username || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Missing username or ids' });
    }
    // Ensure username is sanitized
    const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    const imageDir = path.join(process.cwd(), 'result', safeUsername, 'image'); // Use safeUsername
    let savedIds = [];
    for (const id of ids) {
        // Check common extensions
        const exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4']; // Add mp4 if video is also considered 'saved'
        let found = false;
        for (const ext of exts) {
            const filePath = path.join(imageDir, `${id}.${ext}`);
            // Check in the image directory
            if (fs.existsSync(filePath)) {
                savedIds.push(id);
                found = true;
                break;
            }
            // If not found in image, check in video (only for mp4)
            if (!found && ext === 'mp4') {
                const videoDir = path.join(process.cwd(), 'result', safeUsername, 'video'); // Path to the video directory
                const videoPath = path.join(videoDir, `${id}.${ext}`);
                if (fs.existsSync(videoPath)) {
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
const getSavedList = (req, res) => {
    res.json({ list: readSavedList() });
};

module.exports = {
    checkSaved,
    getSavedList,
};
