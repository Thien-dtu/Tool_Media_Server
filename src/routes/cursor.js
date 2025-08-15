const express = require('express');
const router = express.Router();
const { getLastCursors, saveLastCursor } = require('../controllers/cursorController');

router.post('/get-last-cursors', getLastCursors);
router.post('/save-last-cursor', saveLastCursor);

module.exports = router;
