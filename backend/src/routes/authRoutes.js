const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/verify-id', authenticateToken, upload.single('verification_doc'), authController.uploadVerificationDoc);

module.exports = router;
