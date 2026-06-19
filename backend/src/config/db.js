const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL, 
      ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
        ? false 
        : { rejectUnauthorized: false } 
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'rentiq',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: isProduction ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database.');
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema if not present...');
    
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    const res = await client.query(checkTableQuery);
    const tableExists = res.rows[0].exists;

    if (!tableExists) {
      console.log('Database tables not found. Creating tables...');
      
      await client.query(`
        -- Enable UUID generation extension if available
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Users Table
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'renter',
            id_verified BOOLEAN DEFAULT FALSE,
            verification_doc_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Listings Table
        CREATE TABLE IF NOT EXISTS listings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(100) NOT NULL,
            price_per_day DECIMAL(10, 2) NOT NULL,
            location VARCHAR(255) NOT NULL,
            image_urls TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Bookings Table
        CREATE TABLE IF NOT EXISTS bookings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            renter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            total_price DECIMAL(10, 2) NOT NULL,
            security_deposit DECIMAL(10, 2) NOT NULL,
            payment_status VARCHAR(50) DEFAULT 'unpaid',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Messages Table
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Reviews Table
        CREATE TABLE IF NOT EXISTS reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
            comment TEXT NOT NULL,
            sentiment_score REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Damage Reports Table
        CREATE TABLE IF NOT EXISTS damage_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            photo_type VARCHAR(50) NOT NULL,
            image_urls TEXT NOT NULL,
            gemini_analysis TEXT,
            suggested_deduction DECIMAL(10, 2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Database tables successfully created.');
    } else {
      console.log('Database tables already exist. Skipping creation.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initDb
};
