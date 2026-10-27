// Jarvixss Chat - Transcribe API (Groq Whisper)
// Check Groq docs: https://console.groq.com/docs/speech-to-text

const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
// Update based on current Groq docs
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3';

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  rateLimitStore.set(ip, record);
  return true;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(400).json({ error: 'GROQ_API_KEY not configured' });
    }

    // Note: In Vercel/serverless, handling multipart form data requires different approach
    // This is a simplified version - in practice you'd use formidable or similar
    // For now, we'll return an error suggesting browser SpeechRecognition
    return res.status(501).json({ 
      error: 'Transcribe endpoint requires multipart form handling. Use browser SpeechRecognition when available.' 
    });
  } catch (error) {
    console.error('Transcribe error:', error.message);
    return res.status(500).json({ error: 'Transcribe service error' });
  }
}
