const fs = require('fs');
const path = require('path');

const SAVED_IMAGES_PATH = path.join(process.cwd(), '/data/', 'saved_images.json');
const LAST_CURSORS_PATH = path.join(process.cwd(), '/data/', 'last_cursors.json');

// Helper: Read the JSON file that stores the list of saved images
function readSavedList() {
    try {
        // Ensure the 'result' directory exists before reading/writing the file
        fs.mkdirSync(path.dirname(SAVED_IMAGES_PATH), { recursive: true });
        if (!fs.existsSync(SAVED_IMAGES_PATH)) {
            return [];
        }
        return JSON.parse(fs.readFileSync(SAVED_IMAGES_PATH, 'utf8'));
    } catch (e) {
        console.error("Error reading or parsing saved_images.json:", e);
        return [];
    }
}

// Helper: Write to the JSON file that stores the list of saved images
function writeSavedList(list) {
    try {
        // Ensure the 'result' directory exists before writing the file
        fs.mkdirSync(path.dirname(SAVED_IMAGES_PATH), { recursive: true });
        fs.writeFileSync(SAVED_IMAGES_PATH, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
        console.error("Error writing saved_images.json:", e);
    }
}

// --- LAST CURSOR STORAGE ---
function readLastCursors() {
    try {
        fs.mkdirSync(path.dirname(LAST_CURSORS_PATH), { recursive: true });
        if (!fs.existsSync(LAST_CURSORS_PATH)) return {};
        return JSON.parse(fs.readFileSync(LAST_CURSORS_PATH, 'utf8'));
    } catch (e) {
        console.error('Error reading last_cursors.json:', e);
        return {};
    }
}

function writeLastCursors(obj) {
    try {
        fs.mkdirSync(path.dirname(LAST_CURSORS_PATH), { recursive: true });
        fs.writeFileSync(LAST_CURSORS_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing last_cursors.json:', e);
    }
}

module.exports = {
    readSavedList,
    writeSavedList,
    readLastCursors,
    writeLastCursors,
};
