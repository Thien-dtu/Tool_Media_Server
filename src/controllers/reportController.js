const fs = require('fs');
const path = require('path');

const RESULT_DIR = path.join(process.cwd(), 'data');

// Ensure the result directory exists
fs.mkdirSync(RESULT_DIR, { recursive: true });

// --- SAVE SHUFFLED URLS ---
const saveShuffledUrls = async (req, res) => {
    const { apiName, urls, timestamp } = req.body;
    if (!apiName || !Array.isArray(urls) || !timestamp) {
        return res.status(400).json({ error: 'Missing apiName, urls, or timestamp' });
    }
    const filePath = path.join(RESULT_DIR, `shuffled_urls_${apiName}.jsonl`);
    try {
        fs.appendFileSync(filePath, JSON.stringify({ apiName, urls, timestamp }) + '\n', 'utf8');
        res.json({ message: 'Shuffled URLs saved.' });
    } catch (e) {
        console.error('Error saving shuffled URLs:', e);
        res.status(500).json({ error: 'Failed to save shuffled URLs' });
    }
};

// --- SAVE DETAILED REPORT AFTER EACH CALL ---
const saveIgUserStoriesReport = async (req, res) => {
    const { apiName, report, timestamp } = req.body;
    if (!apiName || !Array.isArray(report) || !timestamp) {
        return res.status(400).json({ error: 'Missing apiName, report, or timestamp' });
    }
    const filePath = path.join(RESULT_DIR, `ig_user_stories_report.jsonl`);
    try {
        fs.appendFileSync(filePath, JSON.stringify({ apiName, report, timestamp }) + '\n', 'utf8');
        res.json({ message: 'Report saved.' });
    } catch (e) {
        console.error('Error saving report:', e);
        res.status(500).json({ error: 'Failed to save report' });
    }
};

// --- DELETE REPORT ENTRY ENDPOINT ---
const deleteReportEntry = async (req, res) => {
    const { timestamp, username, apiName, total, have, nohave, time, pages } = req.body;
    const filePath = path.join(RESULT_DIR, 'ig_user_stories_report.jsonl');
    if (!timestamp || !username || !apiName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Report file not found.' });
        }
        const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
        let changed = false;
        const newLines = lines.map(line => {
            let obj;
            try { obj = JSON.parse(line); } catch { return line; }
            if (obj.timestamp !== timestamp || obj.apiName !== apiName) return line;
            // Remove the matching report entry from the report array
            if (!Array.isArray(obj.report)) return line;
            const newReport = obj.report.filter(r => {
                return !(
                    r.username === username &&
                    r.total === total &&
                    r.have === have &&
                    r.nohave === nohave &&
                    r.time === time &&
                    r.pages === pages
                );
            });
            if (newReport.length !== obj.report.length) {
                changed = true;
                obj.report = newReport;
            }
            // Only keep the line if there are still reports left
            return obj.report.length > 0 ? JSON.stringify(obj) : null;
        }).filter(Boolean);

        if (changed) {
            fs.writeFileSync(filePath, newLines.join('\n') + (newLines.length > 0 ? '\n' : ''), 'utf8');
            return res.json({ message: 'Entry deleted.' });
        } else {
            return res.status(404).json({ error: 'Entry not found.' });
        }
    } catch (e) {
        console.error('Error deleting report entry:', e);
        return res.status(500).json({ error: 'Server error.' });
    }
};

module.exports = {
    saveShuffledUrls,
    saveIgUserStoriesReport,
    deleteReportEntry,
};