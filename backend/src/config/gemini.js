const { GoogleGenAI } = require('@google/generative-ai');

let genAI = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  try {
    
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('Gemini API successfully initialized.');
  } catch (err) {
    console.error('Error initializing Gemini API:', err.message);
  }
} else {
  console.warn('WARNING: GEMINI_API_KEY is not defined in the environment. AI features will run in Mock Mode.');
}

module.exports = {
  genAI,
  isMock: !genAI
};
