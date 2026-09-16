export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' })
    return
  }

  const { messages } = body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: '`messages` must be a non-empty array.' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.status(500).json({
      error: 'GROQ_API_KEY is not configured on the server. Add it in Vercel > Project > Settings > Environment Variables.',
    })
    return
  }

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  })

  if (!upstream.ok) {
    const detail = await upstream.text()
    res.status(502).json({
      error: `The AI provider returned an error (${upstream.status}). ${detail}`,
    })
    return
  }

  const data = await upstream.json()
  const content = data.choices?.[0]?.message?.content

  res.status(200).json({ content: content || 'No response returned.' })
}