// Jarvixss Chat - TTS API (Groq Orpheus)
// Docs: https://console.groq.com/docs/text-to-speech/orpheus

const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const ENGLISH_MODEL = 'canopylabs/orpheus-v1-english';
const ARABIC_MODEL = 'canopylabs/orpheus-arabic-saudi';
const MAX_INPUT_LENGTH = 200;

const VOICE_MODELS = new Map([
  ['autumn', ENGLISH_MODEL],
  ['diana', ENGLISH_MODEL],
  ['hannah', ENGLISH_MODEL],
  ['austin', ENGLISH_MODEL],
  ['daniel', ENGLISH_MODEL],
  ['troy', ENGLISH_MODEL],
  ['abdullah', ARABIC_MODEL],
  ['fahad', ARABIC_MODEL],
  ['sultan', ARABIC_MODEL],
  ['lulwa', ARABIC_MODEL],
  ['noura', ARABIC_MODEL],
  ['aisha', ARABIC_MODEL]
]);

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
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

    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    let { text, voice } = body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' });
    }

    text = text.trim();
    if (!text) return res.status(400).json({ error: 'Missing text' });
    if (text.length > MAX_INPUT_LENGTH) {
      return res.status(400).json({ error: `Text must be ${MAX_INPUT_LENGTH} characters or fewer` });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(400).json({ error: 'GROQ_API_KEY not configured. Add it to .env.local or your Vercel environment.' });
    }

    const voiceId = VOICE_MODELS.has(voice) ? voice : 'hannah';
    const model = VOICE_MODELS.get(voiceId);

    const response = await fetch(GROQ_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: text,
        voice: voiceId,
        response_format: 'wav'
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
      if (response.status === 403 || /terms|accept|permission/i.test(errorText)) {
        return res.status(403).json({
          error: 'Orpheus model terms are not accepted for this Groq account. Accept them in the Groq console.'
        });
      }
      return res.status(response.status).json({
        error: `TTS request failed: ${errorText.slice(0, 200) || response.statusText}`
      });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('TTS error:', error.message);
    return res.status(500).json({ error: 'TTS service error: ' + error.message });
  }
}
