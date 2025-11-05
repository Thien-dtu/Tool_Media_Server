const { readBatchProgress, writeBatchProgress, clearBatchProgress } = require('../utils/fileUtils');

// GET /batch-progress - Get the current batch progress
const getBatchProgress = async (req, res) => {
    try {
        const progress = await readBatchProgress();
        res.json({ progress });
    } catch (err) {
        console.error('Error getting batch progress:', err);
        res.status(500).json({ error: 'Failed to get batch progress' });
    }
};

// POST /batch-progress - Save/update batch progress
// Body: { apiName, timestamp, totalUrls, completedUrls, completedUsernames, lastProcessedIndex }
const saveBatchProgress = async (req, res) => {
    const { apiName, timestamp, totalUrls, completedUrls, completedUsernames, lastProcessedIndex } = req.body;

    if (!apiName || !timestamp || totalUrls === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const progress = {
            apiName,
            timestamp,
            totalUrls,
            completedUrls: completedUrls || [],
            completedUsernames: completedUsernames || [],
            lastProcessedIndex: lastProcessedIndex !== undefined ? lastProcessedIndex : -1,
            lastUpdated: new Date().toISOString()
        };

        await writeBatchProgress(progress);
        res.json({ message: 'Batch progress saved', progress });
    } catch (err) {
        console.error('Error saving batch progress:', err);
        res.status(500).json({ error: 'Failed to save batch progress' });
    }
};

// DELETE /batch-progress - Clear batch progress
const deleteBatchProgress = async (req, res) => {
    try {
        await clearBatchProgress();
        res.json({ message: 'Batch progress cleared' });
    } catch (err) {
        console.error('Error clearing batch progress:', err);
        res.status(500).json({ error: 'Failed to clear batch progress' });
    }
};

module.exports = {
    getBatchProgress,
    saveBatchProgress,
    deleteBatchProgress,
};
