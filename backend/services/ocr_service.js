// Basic OCR service using tesseract.js (Node WASM)
// Note: For best Chinese OCR quality, tesseract language data (chi_sim) is recommended.
// This implementation defaults to 'eng' to avoid heavy language data downloads at runtime.

const Tesseract = require('tesseract.js');

async function recognizeBuffer(buffer, lang = 'eng') {
  try {
    const { data: { text } } = await Tesseract.recognize(buffer, lang, {
      // logger: m => console.log(m) // optional
    });
    return text || '';
  } catch (e) {
    return '';
  }
}

async function extractTextFromImages(files = []) {
  let combined = '';
  for (const file of files) {
    if (!file || !file.buffer) continue;
    const name = file.originalname || 'image';
    const mime = (file.mimetype || '').toLowerCase();
    if (!mime.startsWith('image/')) continue;

    // Try Chinese+English if user configured (TESS_LANG), otherwise fallback to eng
    const lang = process.env.TESS_LANG || 'eng'; // e.g., 'chi_sim+eng'
    try {
      const text = await recognizeBuffer(file.buffer, lang);
      if (text && text.trim()) {
        combined += `\n\n=== ${name} (OCR) ===\n${text.trim()}`;
      } else {
        combined += `\n\n=== ${name} (OCR) ===\n(未识别到可读文本)`;
      }
    } catch (err) {
      combined += `\n\n=== ${name} (OCR) ===\n(识别失败: ${err.message})`;
    }
  }
  return combined.trim();
}

module.exports = {
  extractTextFromImages
};
