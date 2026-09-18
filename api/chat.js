const DEFAULT_MODEL = 'openai/gpt-oss-20b'

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method Not Allowed' })
    return
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    send(res, 400, { error: 'Invalid JSON body.' })
    return
  }

  const { messages } = body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    send(res, 400, { error: '`messages` must be a non-empty array.' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[api/chat] GROQ_API_KEY is not configured on the server.')
    send(res, 500, {
      error:
        'Sun Chat Bot is not configured yet. Add the GROQ_API_KEY environment variable in Vercel > Project > Settings > Environment Variables.',
    })
    return
  }

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL

  let upstream
  let detail = ''
  try {
    upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    })
    detail = await upstream.text()
  } catch (error) {
    console.error('[api/chat] network error calling Groq:', error)
    send(res, 502, {
      error: 'Sun Chat Bot could not reach the AI provider. Please try again later.',
    })
    return
  }

  let data
  try {
    data = JSON.parse(detail)
  } catch {
    console.error('[api/chat] non-JSON response from Groq:', detail)
    send(res, 502, {
      error: 'The AI provider returned an unexpected response. Please try again later.',
    })
    return
  }

  if (!upstream.ok) {
    const errorCode = data?.error?.code
    console.error(
      `[api/chat] Groq returned status ${upstream.status} (model "${model}"):`,
      detail,
    )

    const friendly =
      errorCode === 'model_not_found' || data?.error?.type === 'invalid_request_error'
        ? 'This model is unavailable, please try again later.'
        : `The AI provider could not complete the request (status ${upstream.status}). Please try again later.`

    send(res, 502, { error: friendly })
    return
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    console.error('[api/chat] Groq returned success without message content:', detail)
    send(res, 502, {
      error: 'The AI provider returned an empty response. Please try again later.',
    })
    return
  }

  send(res, 200, { content })
}