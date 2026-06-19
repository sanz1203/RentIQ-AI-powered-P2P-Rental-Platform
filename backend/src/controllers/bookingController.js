const db = require('../config/db');

const createBooking = async (req, res) => {
  const { listing_id, start_date, end_date } = req.body;

  if (!listing_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Please provide listing ID, start date, and end date.' });
  }

  try {
    
    const listingRes = await db.query('SELECT * FROM listings WHERE id = $1', [listing_id]);
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    const listing = listingRes.rows[0];

    if (listing.owner_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot book your own listing.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past.' });
    }
    if (end < start) {
      return res.status(400).json({ error: 'End date must be after start date.' });
    }

    const overlapRes = await db.query(
      `SELECT * FROM bookings 
       WHERE listing_id = $1 
       AND status IN ('pending', 'approved', 'active')
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [listing_id, start_date, end_date]
    );

    if (overlapRes.rows.length > 0) {
      return res.status(400).json({ error: 'These dates are already booked for this item.' });
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    
    const totalPrice = diffDays * parseFloat(listing.price_per_day);
    const securityDeposit = Math.round(totalPrice * 0.3 * 100) / 100; 

    const result = await db.query(
      `INSERT INTO bookings (listing_id, renter_id, start_date, end_date, status, total_price, security_deposit, payment_status)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, 'unpaid')
       RETURNING *`,
      [listing_id, req.user.id, start_date, end_date, totalPrice, securityDeposit]
    );

    res.status(201).json({ message: 'Booking request sent successfully!', booking: result.rows[0] });
  } catch (err) {
    console.error('Create Booking Error:', err);
    res.status(500).json({ error: 'Server error processing booking.' });
  }
};

const getBookings = async (req, res) => {
  try {
    
    const renterBookings = await db.query(
      `SELECT b.*, l.title as listing_title, l.location as listing_location, l.image_urls, u.full_name as owner_name 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON l.owner_id = u.id
       WHERE b.renter_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    const ownerBookings = await db.query(
      `SELECT b.*, l.title as listing_title, l.location as listing_location, l.image_urls, u.full_name as renter_name 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON b.renter_id = u.id
       WHERE l.owner_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.json({
      rentals: renterBookings.rows, 
      listings_rented: ownerBookings.rows 
    });
  } catch (err) {
    console.error('Get Bookings Error:', err);
    res.status(500).json({ error: 'Server error retrieving bookings.' });
  }
};

const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 

  const allowedStatuses = ['approved', 'rejected', 'active', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status update.' });
  }

  try {
    const bookingRes = await db.query(
      `SELECT b.*, l.owner_id, l.title as listing_title 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];

    const isOwner = booking.owner_id === req.user.id;
    const isRenter = booking.renter_id === req.user.id;

    if (status === 'approved' || status === 'rejected' || status === 'completed') {
      if (!isOwner) {
        return res.status(403).json({ error: 'Only the item owner can approve, reject, or complete a booking.' });
      }
    }

    if (status === 'cancelled') {
      if (!isRenter && !isOwner) {
        return res.status(403).json({ error: 'Unauthorized to cancel this booking.' });
      }
    }

    if (status === 'active') {
      
      if (!isRenter && !isOwner) {
        return res.status(403).json({ error: 'Unauthorized to start this booking.' });
      }
    }

    let paymentStatus = booking.payment_status;
    if (status === 'approved') {
      paymentStatus = 'paid';
    } else if (status === 'rejected' || status === 'cancelled') {
      paymentStatus = booking.payment_status === 'paid' ? 'refunded' : 'unpaid';
    }

    const result = await db.query(
      'UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3 RETURNING *',
      [status, paymentStatus, id]
    );

    res.json({ message: `Booking status updated to ${status}.`, booking: result.rows[0] });
  } catch (err) {
    console.error('Update Booking Error:', err);
    res.status(500).json({ error: 'Server error updating booking status.' });
  }
};

module.exports = {
  createBooking,
  getBookings,
  updateBookingStatus
};
