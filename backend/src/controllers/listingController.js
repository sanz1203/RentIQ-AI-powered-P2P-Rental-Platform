const db = require('../config/db');

const createListing = async (req, res) => {
  const { title, description, category, price_per_day, location } = req.body;

  if (!title || !description || !category || !price_per_day || !location) {
    return res.status(400).json({ error: 'Please fill in all listing details.' });
  }

  try {
    let imageUrls = '';
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/listings/${file.filename}`).join(',');
    }

    const result = await db.query(
      'INSERT INTO listings (owner_id, title, description, category, price_per_day, location, image_urls) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, title, description, category, parseFloat(price_per_day), location, imageUrls]
    );

    res.status(201).json({ message: 'Listing created successfully!', listing: result.rows[0] });
  } catch (err) {
    console.error('Create Listing Error:', err);
    res.status(500).json({ error: 'Server error creating listing.' });
  }
};

const getListings = async (req, res) => {
  const { search, category, location } = req.query;

  try {
    let query = `
      SELECT l.*, u.full_name as owner_name 
      FROM listings l
      JOIN users u ON l.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      query += ` AND l.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (location) {
      query += ` AND l.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get Listings Error:', err);
    res.status(500).json({ error: 'Server error retrieving listings.' });
  }
};

const getListingById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT l.*, u.full_name as owner_name, u.email as owner_email, u.id_verified as owner_verified 
       FROM listings l
       JOIN users u ON l.owner_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get Listing Detail Error:', err);
    res.status(500).json({ error: 'Server error retrieving listing details.' });
  }
};

const deleteListing = async (req, res) => {
  const { id } = req.params;

  try {
    
    const check = await db.query('SELECT * FROM listings WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const listing = check.rows[0];
    if (listing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this listing.' });
    }

    await db.query('DELETE FROM listings WHERE id = $1', [id]);
    res.json({ message: 'Listing deleted successfully.' });
  } catch (err) {
    console.error('Delete Listing Error:', err);
    res.status(500).json({ error: 'Server error deleting listing.' });
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  deleteListing
};
