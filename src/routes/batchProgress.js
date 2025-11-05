const express = require('express');
const router = express.Router();
const { getBatchProgress, saveBatchProgress, deleteBatchProgress } = require('../controllers/batchProgressController');

router.get('/batch-progress', getBatchProgress);
router.post('/batch-progress', saveBatchProgress);
router.delete('/batch-progress', deleteBatchProgress);

module.exports = router;
