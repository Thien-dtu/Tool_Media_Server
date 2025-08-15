const express = require('express');
const router = express.Router();
const { handleApiCall } = require('../controllers/apiController');

router.post('/call', handleApiCall);

module.exports = router;
