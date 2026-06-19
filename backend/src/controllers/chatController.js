const db = require('../config/db');

const getChatHistory = async (req, res) => {
  const { bookingId } = req.params;

  try {
    
    const bookingRes = await db.query(
      `SELECT b.*, l.owner_id 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];

    if (booking.renter_id !== req.user.id && booking.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You are not a party to this booking.' });
    }

    const result = await db.query(
      `SELECT m.*, u.full_name as sender_name 
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.booking_id = $1
       ORDER BY m.created_at ASC`,
      [bookingId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get Chat History Error:', err);
    res.status(500).json({ error: 'Server error retrieving chat history.' });
  }
};

module.exports = {
  getChatHistory
};
