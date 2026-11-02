// Jarvixss Chat - Transcribe API (Groq Whisper)
// Docs: https://console.groq.com/docs/speech-to-text

const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3';
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

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

function readStream(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) {
        reject(new Error('Audio file is too large. Keep recordings under 10MB.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readRequestBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object' && req.body.type === 'Buffer' && Array.isArray(req.body.data)) {
    return Buffer.from(req.body.data);
  }
  return readStream(req);
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
      return res.status(400).json({ error: 'GROQ_API_KEY not configured. Add it to .env.local or your Vercel environment.' });
    }

    const audio = await readRequestBody(req);
    if (!audio || audio.length < 1000) {
      return res.status(400).json({ error: 'No audio data received.' });
    }
    if (audio.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({ error: 'Audio file is too large. Keep recordings under 10MB.' });
    }

    const contentType = String(req.headers['content-type'] || 'audio/webm').split(';')[0].trim() || 'audio/webm';
    const extension = contentType.includes('wav')
      ? 'wav'
      : contentType.includes('mp4') || contentType.includes('m4a')
        ? 'm4a'
        : contentType.includes('ogg')
          ? 'ogg'
          : 'webm';

    const form = new FormData();
    form.append('file', new Blob([audio], { type: contentType }), `recording.${extension}`);
    form.append('model', GROQ_WHISPER_MODEL);
    form.append('response_format', 'json');
    form.append('temperature', '0');

    const response = await fetch(GROQ_TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`
      },
      body: form,
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Groq API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Groq rate limit exceeded' });
      }
      return res.status(response.status).json({
        error: `Transcription failed: ${errorText.slice(0, 200) || response.statusText}`
      });
    }

    const data = await response.json().catch(() => ({}));
    const text = String(data.text || '').trim();
    if (!text) {
      return res.status(422).json({ error: 'No speech was detected in the recording.' });
    }
    return res.status(200).json({ text });
  } catch (error) {
    console.error('Transcribe error:', error.message);
    return res.status(500).json({ error: 'Transcribe service error: ' + error.message });
  }
}
