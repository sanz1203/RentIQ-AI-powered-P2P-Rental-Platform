const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforrentiqschoolproject123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'anotherrefreshsecretkeythatisverysecure456';

const signup = async (req, res) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Please provide email, password, and full name.' });
  }

  try {
    
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, id_verified',
      [email, passwordHash, full_name, role || 'renter']
    );

    res.status(201).json({ message: 'User registered successfully!', user: newUser.rows[0] });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter email and password.' });
  }

  try {
    
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.full_name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 
    });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        id_verified: user.id_verified
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
};

const getProfile = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, full_name, role, id_verified, verification_doc_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile Error:', err);
    res.status(500).json({ error: 'Server error fetching profile.' });
  }
};

const uploadVerificationDoc = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an ID verification file.' });
  }

  try {
    const fileUrl = `/uploads/verifications/${req.file.filename}`;
    
    const result = await db.query(
      'UPDATE users SET verification_doc_url = $1, id_verified = TRUE WHERE id = $2 RETURNING id, id_verified',
      [fileUrl, req.user.id]
    );

    res.json({
      message: 'ID document uploaded successfully! Verification complete.',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Upload ID Error:', err);
    res.status(500).json({ error: 'Server error during document upload.' });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getProfile,
  uploadVerificationDoc
};
