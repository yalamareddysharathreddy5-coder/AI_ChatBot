const POLLINATIONS_BASE_URL = 'https://image.pollinations.ai/prompt'

const IMAGE_ACTION_WORDS =
  'generate|create|make|draw|paint|render|produce|design|show|send|give|need|want|get'
const IMAGE_NOUN_WORDS =
  'image|picture|photo|photograph|illustration|artwork|logo|poster|wallpaper|avatar|drawing|painting|meme|sketch|cartoon|portrait|infographic|banner|mascot|icon|art'
const IMAGE_SUBJECT_WORDS =
  'image|picture|photo|photograph|illustration|artwork|drawing|painting|sketch'

const IMAGE_QUERY_RE = new RegExp(
  [
    // "image of X" / "picture of a cat" / "photo of my dog" (no verb needed)
    `\\b(?:${IMAGE_SUBJECT_WORDS})\\b\\s+(?:of|for|with|showing)\\b`,
    // image action + image noun, either order, within a short span
    `\\b(?:${IMAGE_ACTION_WORDS})\\b.{0,60}?\\b(?:${IMAGE_NOUN_WORDS})\\b`,
    `\\b(?:${IMAGE_NOUN_WORDS})\\b.{0,60}?\\b(?:${IMAGE_ACTION_WORDS})\\b`,
    // leading generative verb with a subject ("draw a dragon", "generate a sunset")
    `^(?:please\\s+)?(?:generate|draw|paint|render|sketch|illustrate)\\b(?=\\s+(?:(?:a |an |the |some |me |us |it ){0,2})\\w{3,})`,
  ].join('|'),
  'i'
)
const IMAGE_QUERY_EXCLUSION_RE =
  /\b(conclusion|conclusions|parallel|parallels|distinction|inference|attention to|ire|a blank)\b/i

/**
 * True when a message asks to generate, create, or draw an image (e.g.
 * "give me image of lion", "generate an image of a sunset", "show me a picture
 * of a cat", "draw a dragon"). Shared by the client (to route BEFORE any Groq
 * call) and the server (as a second line of defense).
 */
export function isImageQuery(text) {
  const value = String(text || '')
  if (IMAGE_QUERY_EXCLUSION_RE.test(value)) return false
  return IMAGE_QUERY_RE.test(value)
}

const LEADING_VERB_RE =
  /^(?:please\s+)?(?:can you|could you|would you)\s+|^(?:give me|show me|make me|draw me|paint me|render me|generate me|create me|get me|i want|i need|i would like|want|need|show|send|give|generate|create|make|draw|paint|render|sketch|illustrate|produce|design)\s+/i
const LEADING_ARTICLE_RE = /^(?:an?|the|some|me|us)\s+/i

function cleanSubject(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim()
}

const BARE_GENERIC_NOUN_RE =
  /^(?:an?|the|some|me|us|our\s+)?(?:image|picture|photo|photograph|illustration|artwork|art|meme)$/i

/**
 * Pulls the image subject out of a request so it becomes a clean image prompt:
 * "give me image of lion" -> "lion", "show me a picture of a cat" -> "a cat",
 * "draw me a dragon" -> "dragon". Falls back to the whole message when no
 * subject can be isolated.
 */
export function extractImageSubject(message) {
  const text = String(message || '').trim()
  if (!text) return text

  const connectorMatch = text.match(
    /(?:image|picture|photo|photograph|illustration|artwork|drawing|painting|sketch)\s+(?:of|for|with|showing)\s+(.+)$/i
  )
  if (connectorMatch) return cleanSubject(connectorMatch[1])

  const remainder = text
    .replace(LEADING_VERB_RE, '')
    .replace(LEADING_ARTICLE_RE, '')
  const cleaned = cleanSubject(remainder)
  if (cleaned && !BARE_GENERIC_NOUN_RE.test(cleaned)) return cleaned
  return cleanSubject(text)
}

/**
 * Builds a direct image URL for a prompt using Pollinations.ai — free, no API
 * key required. The URL points straight at the generated image (an <img> tag
 * loads it like any other image URL).
 */
export function buildImageUrl(prompt) {
  const url = new URL(`${POLLINATIONS_BASE_URL}/${encodeURIComponent(prompt)}`)
  url.searchParams.set('width', '1024')
  url.searchParams.set('height', '1024')
  url.searchParams.set('nologo', 'true')
  url.searchParams.set('seed', String(Math.floor(Math.random() * 2147483647)))
  return url.toString()
}