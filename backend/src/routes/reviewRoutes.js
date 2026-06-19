const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, reviewController.createReview);
router.get('/user/:userId', reviewController.getUserReviews);

module.exports = router;
