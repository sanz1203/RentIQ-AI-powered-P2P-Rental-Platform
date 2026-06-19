const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/suggest-price', authenticateToken, aiController.suggestPrice);
router.post('/damage-check', authenticateToken, upload.array('damage_images', 3), aiController.checkDamage);

module.exports = router;
