// NovaChat - Vercel Serverless Function
// Primary provider: Groq Cloud (OpenAI-compatible API)
// Optional fallback: Google Gemini

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TEXT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const GEMINI_MODELS = [
  ...new Set(
    [
      process.env.GEMINI_MODEL,
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest'
    ].filter(Boolean)
  )
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let personality = 'friendly';

  try {
    const body = req.body || {};
    const { messages, image } = body;
    personality = body.personality || 'friendly';

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.AI_API_KEY;
    const providers = [];

    if (groqKey) {
      providers.push({
        name: 'groq',
        run: () => callGroq({ apiKey: groqKey, messages, image, personality })
      });
    }

    if (geminiKey) {
      providers.push({
        name: 'gemini',
        run: () => callGemini({ apiKey: geminiKey, messages, image, personality })
      });
    }

    if (providers.length === 0) {
      return res.status(200).json({
        message: getDemoResponse(personality),
        demo: true
      });
    }

    const errors = [];

    for (const provider of providers) {
      try {
        const result = await provider.run();
        return res.status(200).json(result);
      } catch (error) {
        errors.push(`${provider.name}: ${redactSecrets(error.message, [groqKey, geminiKey])}`);
      }
    }

    console.error('AI provider errors:', errors.join(' | '));
    return res.status(200).json({
      message: getDemoResponse(personality),
      demo: true
    });
  } catch (error) {
    console.error('Server error:', redactSecrets(error.message, [process.env.GROQ_API_KEY, process.env.AI_API_KEY]));
    return res.status(200).json({
      message: getDemoResponse(personality),
      demo: true
    });
  }
}

async function callGroq({ apiKey, messages, image, personality }) {
  const model = image ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL;
  const requestMessages = [
    { role: 'system', content: buildSystemPrompt(personality) },
    ...buildGroqMessages(messages, image)
  ];

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: requestMessages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || `Groq API returned ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  const text = typeof content === 'string' ? content.trim() : '';

  if (!text) {
    throw new Error('Groq returned an empty response');
  }

  return { message: text, model, provider: 'groq' };
}

function buildGroqMessages(messages, image) {
  const history = messages.slice(-20);

  return history.map((message, index) => {
    const isLast = index === history.length - 1;
    const role = isLast && image ? 'user' : message.role === 'assistant' ? 'assistant' : 'user';
    const text = (message.content || '').trim();

    if (isLast && image) {
      const content = [];
      if (text) {
        content.push({ type: 'text', text });
      }
      content.push({ type: 'image_url', image_url: { url: image } });
      return { role, content };
    }

    return { role, content: text || ' ' };
  });
}

async function callGemini({ apiKey, messages, image, personality }) {
  const requestBody = {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt(personality) }]
    },
    contents: buildGeminiContents(messages, image),
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  };

  let lastError = 'Unknown Gemini API error';

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(25000)
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        lastError = data.error?.message || `Gemini API returned ${response.status}`;
        continue;
      }

      const aiResponse = extractGeminiText(data);
      if (aiResponse) {
        return { message: aiResponse, model, provider: 'gemini' };
      }

      lastError = 'Gemini returned an empty response';
    } catch (error) {
      lastError = error.message;
    }
  }

  throw new Error(lastError);
}

function buildGeminiContents(messages, image) {
  const history = messages.slice(-20);
  const contents = [];

  history.forEach((message, index) => {
    const role = message.role === 'assistant' ? 'model' : 'user';
    const parts = [];
    const text = (message.content || '').trim();

    if (text) {
      parts.push({ text });
    }

    if (index === history.length - 1 && image) {
      const imageData = parseImageDataUrl(image);
      if (imageData) {
        parts.push({ inlineData: imageData });
      }
    }

    if (parts.length === 0) {
      parts.push({ text: ' ' });
    }

    if (contents.length === 0 && role === 'model') {
      return;
    }

    const previous = contents[contents.length - 1];
    if (previous && previous.role === role) {
      previous.parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  });

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return contents;
}

function parseImageDataUrl(image) {
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(image);
  if (!match) return null;

  return {
    mimeType: match[1] || 'image/jpeg',
    data: match[2]
  };
}

function extractGeminiText(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts
    .map(part => part.text || '')
    .join('')
    .trim();
}

function redactSecrets(value, secrets) {
  let text = String(value || '');

  for (const secret of secrets) {
    if (secret) {
      text = text.split(secret).join('[REDACTED]');
    }
  }

  return text;
}

function buildSystemPrompt(personality) {
  const basePrompt = `You are Nova, a helpful, friendly, and clear AI assistant.
You can answer any topic: general knowledge, politics, places and travel, studies and homework, new technology, coding, health basics, news-style explanations.

Important rules:
- For politics and controversial topics, be balanced and neutral. Present multiple viewpoints and do not push opinions.
- If you are unsure about something, say so clearly.
- Be concise but thorough.
- Use markdown formatting when helpful (bold, lists, code blocks).
- Keep responses appropriate and helpful.`;

  const personalityPrompts = {
    friendly: basePrompt + '\n\nPersonality: Warm, conversational, and encouraging. Use casual but respectful language.',
    teacher: basePrompt + '\n\nPersonality: Educational and patient. Explain concepts step by step. Use examples and analogies to help learning.',
    professional: basePrompt + '\n\nPersonality: Formal, precise, and business-like. Get straight to the point with clear, structured answers.',
    funny: basePrompt + '\n\nPersonality: Witty and humorous while remaining helpful and respectful. Add light humor when appropriate without being offensive.'
  };

  return personalityPrompts[personality] || personalityPrompts.friendly;
}

function getDemoResponse(personality) {
  const responses = {
    friendly: "Hello! I'm Nova. I couldn't reach the AI service just now. Please check your API key and try again in a moment.",
    teacher: "I'm ready to help you learn. I couldn't reach the AI service just now, so please check the API key and try again.",
    professional: "The AI service is currently unavailable. Please verify the API configuration and retry your request.",
    funny: "My brain's buffering right now! I couldn't reach the AI service, so give it another try in a moment."
  };

  return responses[personality] || responses.friendly;
}
