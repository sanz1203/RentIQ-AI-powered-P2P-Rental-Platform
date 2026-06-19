const db = require('../config/db');
const geminiService = require('../services/geminiService');
const path = require('path');

const suggestPrice = async (req, res) => {
  const { title, description, category, location } = req.body;

  if (!title || !category || !location) {
    return res.status(400).json({ error: 'Please provide title, category, and location for pricing analysis.' });
  }

  try {
    
    const compsRes = await db.query(
      'SELECT price_per_day FROM listings WHERE category = $1 LIMIT 5',
      [category]
    );
    
    const competitorPrices = compsRes.rows.map(row => parseFloat(row.price_per_day));

    const suggestion = await geminiService.getSmartPricingRecommendation(
      title,
      description || '',
      category,
      location,
      competitorPrices
    );

    res.json(suggestion);
  } catch (err) {
    console.error('Suggest Price Endpoint Error:', err);
    res.status(500).json({ error: 'Failed to generate smart pricing suggestion.' });
  }
};

const checkDamage = async (req, res) => {
  const { booking_id, photo_type } = req.body; 

  if (!booking_id || !photo_type) {
    return res.status(400).json({ error: 'Please provide booking_id and photo_type.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one inspection photo.' });
  }

  try {
    const bookingRes = await db.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingRes.rows[0];

    const currentPhotoUrls = req.files.map(file => `/uploads/damage/${file.filename}`).join(',');

    const newReportRes = await db.query(
      `INSERT INTO damage_reports (booking_id, photo_type, image_urls) 
       VALUES ($1, $2, $3) RETURNING *`,
      [booking_id, photo_type, currentPhotoUrls]
    );
    const newReport = newReportRes.rows[0];

    if (photo_type === 'post_rental') {
      const preReportRes = await db.query(
        `SELECT * FROM damage_reports 
         WHERE booking_id = $1 AND photo_type = 'pre_rental' 
         ORDER BY created_at DESC LIMIT 1`,
        [booking_id]
      );

      if (preReportRes.rows.length > 0) {
        const preReport = preReportRes.rows[0];
        
        const resolvePath = (relativeUrl) => {
          const fileName = relativeUrl.split('/').pop();
          return path.join(__dirname, '../../uploads/damage', fileName);
        };

        const preAbsolutePaths = preReport.image_urls.split(',').map(resolvePath);
        const postAbsolutePaths = currentPhotoUrls.split(',').map(resolvePath);

        console.log('Comparing check-in vs check-out photos using Gemini Vision...');
        const analysisResult = await geminiService.analyzeDamagePhotos(preAbsolutePaths, postAbsolutePaths);

        await db.query(
          `UPDATE damage_reports 
           SET gemini_analysis = $1, suggested_deduction = $2 
           WHERE id = $3`,
          [JSON.stringify(analysisResult), analysisResult.suggested_deduction, newReport.id]
        );

        if (analysisResult.has_new_damage && analysisResult.suggested_deduction > 0) {
          await db.query(
            `UPDATE bookings SET payment_status = 'disputed' WHERE id = $1`,
            [booking_id]
          );
        }

        return res.json({
          message: 'Inspection complete. Gemini damage analysis generated!',
          analysis: analysisResult,
          report: { ...newReport, gemini_analysis: JSON.stringify(analysisResult), suggested_deduction: analysisResult.suggested_deduction }
        });
      }
    }

    res.json({
      message: `Inspection photo (${photo_type}) uploaded successfully.`,
      report: newReport
    });
  } catch (err) {
    console.error('Damage Inspection Error:', err);
    res.status(500).json({ error: 'Failed to process damage inspection.' });
  }
};

module.exports = {
  suggestPrice,
  checkDamage
};
