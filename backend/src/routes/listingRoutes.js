const express = require('express');
const listingController = require('../controllers/listingController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', authenticateToken, upload.array('listing_images', 5), listingController.createListing);
router.get('/', listingController.getListings);
router.get('/:id', listingController.getListingById);
router.delete('/:id', authenticateToken, listingController.deleteListing);

module.exports = router;
