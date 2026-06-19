const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/booking/:bookingId', authenticateToken, chatController.getChatHistory);

module.exports = router;
