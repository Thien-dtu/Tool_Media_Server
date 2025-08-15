const express = require('express');
const router = express.Router();
const {
    saveShuffledUrls,
    saveIgUserStoriesReport,
    deleteReportEntry,
} = require('../controllers/reportController');

router.post('/save-shuffled-urls', saveShuffledUrls);
router.post('/save-ig-user-stories-report', saveIgUserStoriesReport);
router.post('/delete-report-entry', deleteReportEntry);

module.exports = router;