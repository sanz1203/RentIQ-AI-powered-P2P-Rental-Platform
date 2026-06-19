const { genAI, isMock } = require('../config/gemini');
const fs = require('fs');
const path = require('path');

const fileToGenerativePart = (filePath, mimeType) => {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
};

const getSmartPricingRecommendation = async (title, description, category, location, competitorPrices) => {
  if (isMock) {
    
    const avg = competitorPrices.length ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length : 1500.00;
    const recommended = Math.round(avg * 0.95 * 100) / 100;
    return {
      suggested_price_range: { min: Math.round(recommended * 0.8 * 100) / 100, max: Math.round(recommended * 1.2 * 100) / 100 },
      recommended_price: recommended,
      reasoning: `(MOCK MODE) Based on ${competitorPrices.length || 3} local comps in ${location || 'New Delhi'}. Standard daily rates for ${category || 'gear'} average ₹${avg.toFixed(2)}. Your listing has been priced slightly below average to attract early bookings.`
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are a smart rental pricing engine for a P2P rental platform called RentIQ.
      Given the following details of an item:
      - Title: "${title}"
      - Description: "${description}"
      - Category: "${category}"
      - Location: "${location}"
      - Database Comp Prices (Daily): ${JSON.stringify(competitorPrices)}
      
      Recommend an optimal daily price range (min, max) and a specific recommended price in Indian Rupees (INR, ₹).
      Provide a brief, helpful explanation (2-3 sentences max) justifying the pricing in Indian Rupees based on the comps, category, and location.
      
      Return ONLY a JSON object matching this structure:
      {
        "suggested_price_range": { "min": number, "max": number },
        "recommended_price": number,
        "reasoning": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Gemini Pricing Service Error:", err);
    throw err;
  }
};

const analyzeDamagePhotos = async (prePhotos, postPhotos) => {
  if (isMock) {
    
    const hasDamage = Math.random() > 0.5;
    if (hasDamage) {
      return {
        has_new_damage: true,
        damage_details: "(MOCK MODE) A new hairline scratch detected on the side surface. Not visible in the check-in photo.",
        severity: "low",
        suggested_deduction: 500.00
      };
    } else {
      return {
        has_new_damage: false,
        damage_details: "(MOCK MODE) No new scratches or damages detected. Item condition matches pre-rental baseline.",
        severity: "none",
        suggested_deduction: 0.00
      };
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const imageParts = [];
    
    if (prePhotos && prePhotos.length > 0) {
      const ext = path.extname(prePhotos[0]).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      imageParts.push(fileToGenerativePart(prePhotos[0], mime));
    }
    
    if (postPhotos && postPhotos.length > 0) {
      const ext = path.extname(postPhotos[0]).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      imageParts.push(fileToGenerativePart(postPhotos[0], mime));
    }

    if (imageParts.length < 2) {
      throw new Error("Must provide at least one pre-rental photo and one post-rental photo.");
    }

    const prompt = `
      Analyze these two photos of a rental item.
      The first photo represents the item's condition BEFORE the rental (check-in / baseline).
      The second photo represents the item's condition AFTER the rental (check-out).
      
      Compare them carefully. Identify if there are any NEW scratches, dents, cracks, or damages that occurred during the rental.
      Calculate a fair Suggested Deduction in Indian Rupees (INR, ₹) from the renter's security deposit if new damage is present (max ₹5000 for minor, higher for major). If no damage, set to 0.
      
      Return ONLY a JSON object matching this structure:
      {
        "has_new_damage": boolean,
        "damage_details": "string description of differences, or 'No damage' if clean",
        "severity": "none" | "low" | "medium" | "high",
        "suggested_deduction": number
      }
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Gemini Vision Service Error:", err);
    throw err;
  }
};

const analyzeReviewSentiment = async (comment) => {
  if (isMock) {
    
    const positiveWords = ['great', 'awesome', 'excellent', 'perfect', 'good', 'nice', 'friendly', 'clean', 'easy'];
    const negativeWords = ['bad', 'dirty', 'late', 'rude', 'broken', 'scratched', 'terrible', 'worst', 'scam'];
    
    let score = 0.0;
    const lowerComment = comment.toLowerCase();
    positiveWords.forEach(w => { if (lowerComment.includes(w)) score += 0.3; });
    negativeWords.forEach(w => { if (lowerComment.includes(w)) score -= 0.3; });
    
    score = Math.max(-1.0, Math.min(1.0, score));
    return { sentiment_score: Math.round(score * 10) / 10 };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Analyze the sentiment of the following review comment left on a user profile.
      Rate the sentiment on a scale from -1.0 (extremely negative/disastrous experience) to 1.0 (extremely positive/perfect experience).
      
      Review Comment: "${comment}"
      
      Return ONLY a JSON object matching this structure:
      {
        "sentiment_score": number
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Gemini Sentiment Service Error:", err);
    return { sentiment_score: 0.0 }; 
  }
};

module.exports = {
  getSmartPricingRecommendation,
  analyzeDamagePhotos,
  analyzeReviewSentiment
};
