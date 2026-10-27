// Jarvixss Chat - TTS API (Groq)
// Check Groq docs for current TTS model and voices: https://console.groq.com/docs/text-to-speech

const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
// Update these constants based on current Groq docs
const GROQ_TTS_MODEL = process.env.GROQ_TTS_MODEL || 'playai-tts';
const GROQ_TTS_VOICES = [
  'Arista-PlayAI',
  'Atlas-PlayAI',
  'Basil-PlayAI',
  'Briggs-PlayAI',
  'Calum-PlayAI',
  'Celeste-PlayAI',
  'Cheyenne-PlayAI',
  'Chip-PlayAI',
  'Cillian-PlayAI',
  'Deedee-PlayAI',
  'Fritz-PlayAI',
  'Gail-PlayAI',
  'Indigo-PlayAI',
  'Mamaw-PlayAI',
  'Mason-PlayAI',
  'Mikail-PlayAI',
  'Mitch-PlayAI',
  'Nia-PlayAI',
  'Quinn-PlayAI',
  'Thunder-PlayAI'
];

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // requests per minute

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

    const body = req.body || {};
    let { text, voice } = body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' });
    }

    // Limit text length
    text = text.slice(0, 4096);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(400).json({ error: 'GROQ_API_KEY not configured' });
    }

    if (!voice || !GROQ_TTS_VOICES.includes(voice)) {
      voice = GROQ_TTS_VOICES[0];
    }

    const response = await fetch(GROQ_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_TTS_MODEL,
        input: text,
        voice: voice,
        response_format: 'mp3'
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Groq API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Groq rate limit exceeded' });
      }
      if (response.status === 403 || /terms|accept/i.test(errorText)) {
        return res.status(403).json({ error: 'Model requires terms acceptance or is unavailable' });
      }
      return res.status(response.status).json({ error: 'TTS request failed' });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('TTS error:', error.message);
    return res.status(500).json({ error: 'TTS service error' });
  }
}
