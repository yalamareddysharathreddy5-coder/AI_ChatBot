const POLLINATIONS_BASE_URL = 'https://image.pollinations.ai/prompt'

const IMAGE_ACTION_WORDS =
  'generate|create|make|draw|paint|render|produce|design|show|send|need|want'
const IMAGE_NOUN_WORDS =
  'image|picture|photo|photograph|illustration|artwork|logo|poster|wallpaper|avatar|drawing|painting|meme|sketch|cartoon|portrait|infographic|banner|mascot|icon|art'
const IMAGE_QUERY_RE = new RegExp(
  `\\b(?:${IMAGE_ACTION_WORDS})\\b.{0,60}?\\b(?:${IMAGE_NOUN_WORDS})\\b|\\b(?:${IMAGE_NOUN_WORDS})\\b.{0,60}?\\b(?:${IMAGE_ACTION_WORDS})\\b|\\b(?:generate|draw|paint|render|sketch|illustrate)\\b(?=\\s+(?:(?:a |an |the |some |me |us |it ){0,2})\\w{3,})`,
  'i'
)
const IMAGE_QUERY_EXCLUSION_RE =
  /\b(conclusion|conclusions|parallel|parallels|distinction|inference|attention to|ire|a blank)\b/i

/**
 * True when a message asks to generate, create, or draw an image (e.g.
 * "generate an image of a sunset", "draw a dragon"). Shared by the client (to
 * route BEFORE any Groq call) and the server (as a second line of defense).
 */
export function isImageQuery(text) {
  const value = String(text || '')
  if (IMAGE_QUERY_EXCLUSION_RE.test(value)) return false
  return IMAGE_QUERY_RE.test(value)
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