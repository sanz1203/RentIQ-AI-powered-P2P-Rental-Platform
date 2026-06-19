const db = require('../config/db');
const geminiService = require('../services/geminiService');

const createReview = async (req, res) => {
  const { booking_id, rating, comment } = req.body;

  if (!booking_id || !rating || !comment) {
    return res.status(400).json({ error: 'Please provide booking_id, rating, and comment.' });
  }

  try {
    
    const bookingRes = await db.query(
      `SELECT b.*, l.owner_id 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];

    let reviewee_id;
    if (booking.renter_id === req.user.id) {
      reviewee_id = booking.owner_id;
    } else if (booking.owner_id === req.user.id) {
      reviewee_id = booking.renter_id;
    } else {
      return res.status(403).json({ error: 'You are not authorized to review this booking.' });
    }

    const checkReview = await db.query(
      'SELECT * FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
      [booking_id, req.user.id]
    );
    if (checkReview.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this booking.' });
    }

    console.log(`Analyzing review sentiment for comment: "${comment.substring(0, 30)}..."`);
    const sentimentRes = await geminiService.analyzeReviewSentiment(comment);
    const sentimentScore = sentimentRes.sentiment_score;

    const newReviewRes = await db.query(
      `INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment, sentiment_score)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [booking_id, req.user.id, reviewee_id, parseInt(rating), comment, sentimentScore]
    );
    const newReview = newReviewRes.rows[0];

    res.status(201).json({ message: 'Review submitted successfully!', review: newReview });
  } catch (err) {
    console.error('Create Review Error:', err);
    res.status(500).json({ error: 'Server error submitting review.' });
  }
};

const getUserReviews = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      `SELECT r.*, u.full_name as reviewer_name 
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get Reviews Error:', err);
    res.status(500).json({ error: 'Server error retrieving reviews.' });
  }
};

module.exports = {
  createReview,
  getUserReviews
};
