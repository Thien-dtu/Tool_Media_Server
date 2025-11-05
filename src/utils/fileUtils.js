const fs = require('fs');
const path = require('path');

const SAVED_IMAGES_PATH = path.join(process.cwd(), '/data/', 'saved_images.json');
const LAST_CURSORS_PATH = path.join(process.cwd(), '/data/', 'last_cursors.json');
const BATCH_PROGRESS_PATH = path.join(process.cwd(), '/data/', 'batch_progress.json');

// Helper: Read the JSON file that stores the list of saved images (async)
async function readSavedList() {
    try {
        // Ensure the 'result' directory exists before reading/writing the file
        await fs.promises.mkdir(path.dirname(SAVED_IMAGES_PATH), { recursive: true });
        const exists = await fs.promises.access(SAVED_IMAGES_PATH).then(() => true).catch(() => false);
        if (!exists) {
            return [];
        }
        const data = await fs.promises.readFile(SAVED_IMAGES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading or parsing saved_images.json:", e);
        return [];
    }
}

// Helper: Write to the JSON file that stores the list of saved images (async)
async function writeSavedList(list) {
    try {
        // Ensure the 'result' directory exists before writing the file
        await fs.promises.mkdir(path.dirname(SAVED_IMAGES_PATH), { recursive: true });
        await fs.promises.writeFile(SAVED_IMAGES_PATH, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
        console.error("Error writing saved_images.json:", e);
    }
}

// --- LAST CURSOR STORAGE (async) ---
async function readLastCursors() {
    try {
        await fs.promises.mkdir(path.dirname(LAST_CURSORS_PATH), { recursive: true });
        const exists = await fs.promises.access(LAST_CURSORS_PATH).then(() => true).catch(() => false);
        if (!exists) return {};
        const data = await fs.promises.readFile(LAST_CURSORS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading last_cursors.json:', e);
        return {};
    }
}

async function writeLastCursors(obj) {
    try {
        await fs.promises.mkdir(path.dirname(LAST_CURSORS_PATH), { recursive: true });
        await fs.promises.writeFile(LAST_CURSORS_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing last_cursors.json:', e);
    }
}

// --- BATCH PROGRESS STORAGE (async) ---
async function readBatchProgress() {
    try {
        await fs.promises.mkdir(path.dirname(BATCH_PROGRESS_PATH), { recursive: true });
        const exists = await fs.promises.access(BATCH_PROGRESS_PATH).then(() => true).catch(() => false);
        if (!exists) return null;
        const data = await fs.promises.readFile(BATCH_PROGRESS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading batch_progress.json:', e);
        return null;
    }
}

async function writeBatchProgress(obj) {
    try {
        await fs.promises.mkdir(path.dirname(BATCH_PROGRESS_PATH), { recursive: true });
        await fs.promises.writeFile(BATCH_PROGRESS_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing batch_progress.json:', e);
    }
}

async function clearBatchProgress() {
    try {
        const exists = await fs.promises.access(BATCH_PROGRESS_PATH).then(() => true).catch(() => false);
        if (exists) {
            await fs.promises.unlink(BATCH_PROGRESS_PATH);
        }
    } catch (e) {
        console.error('Error clearing batch_progress.json:', e);
    }
}

module.exports = {
    readSavedList,
    writeSavedList,
    readLastCursors,
    writeLastCursors,
    readBatchProgress,
    writeBatchProgress,
    clearBatchProgress,
};
