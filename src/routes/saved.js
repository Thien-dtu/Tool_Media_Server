const express = require('express');
const router = express.Router();
const { checkSaved, getSavedList } = require('../controllers/savedController');

router.post('/check-saved', checkSaved);
router.get('/saved-list', getSavedList);

module.exports = router;
