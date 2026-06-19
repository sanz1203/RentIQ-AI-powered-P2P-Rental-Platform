const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, bookingController.createBooking);
router.get('/', authenticateToken, bookingController.getBookings);
router.put('/:id/status', authenticateToken, bookingController.updateBookingStatus);

module.exports = router;
