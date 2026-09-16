const HEADING_EMOJI_RULES = [
  {
    emoji: '💡',
    keywords: ['tip', 'tips', 'advice', 'recommend', 'suggest', 'idea', 'best practice'],
  },
  {
    emoji: '✅',
    keywords: [
      'step',
      'steps',
      'how to',
      'how do i',
      'how can',
      'instruction',
      'instructions',
      'guide',
      'checklist',
      'setup',
      'set up',
      'getting started',
      'get started',
      'walkthrough',
    ],
  },
  {
    emoji: '⚠️',
    keywords: [
      'note',
      'warning',
      'caution',
      'important',
      'attention',
      'careful',
      'reminder',
      'beware',
      'do not',
    ],
  },
  {
    emoji: '📌',
    keywords: [
      'summary',
      'recap',
      'conclusion',
      'key takeaway',
      'key takeaways',
      'overview',
      'wrap-up',
      'wrap up',
      'in short',
    ],
  },
  {
    emoji: '🔧',
    keywords: ['fix', 'solution', 'solutions', 'troubleshoot', 'debug', 'resolve', 'workaround'],
  },
  {
    emoji: 'ℹ️',
    keywords: ['information', 'details', 'background', 'context'],
  },
]

const OPENER_EMOJI_RULES = [
  {
    emoji: '👋',
    match: (s) => /^(hi|hello|hey|greetings|yo|welcome|good morning|good afternoon|good evening)\b/i.test(s),
  },
  {
    emoji: '🎉',
    match: (s) => /(congrat|well done|great job|excellent work|amazing work|you did it|nailed it|success|celebrat)/i.test(s),
  },
  {
    emoji: '🤔',
    match: (s) =>
      /^(could you|can you|what do|what are|which one|how would|could we|do you mean|are you|would you|will you|is there)/i.test(s) ||
      /need (a bit )?more (info|detail|information|clarity)|clarif/i.test(s),
  },
  {
    emoji: '😕',
    match: (s) => /^(sorry|unfortunately|i couldn|i can'?t|i was unable|that didn'?t|oops|uh oh)/i.test(s),
  },
]

const STARTS_WITH_EMOJI = /^\s*\p{Extended_Pictographic}/u
const HEADING_RE = /^(\s{0,3})(#{1,6})\s+(.*)$/

function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

function emojiForHeading(heading) {
  for (const rule of HEADING_EMOJI_RULES) {
    if (rule.keywords.some((keyword) => matchesKeyword(heading, keyword))) return rule.emoji
  }
  return ''
}

function emojiForOpener(text) {
  const head = text.slice(0, 180)
  for (const rule of OPENER_EMOJI_RULES) {
    if (rule.match(head)) return rule.emoji
  }
  return ''
}

export function decorateReply(content) {
  if (typeof content !== 'string' || content.trim() === '') return content

  const trimmed = content.trim()
  if (trimmed.startsWith('>')) return content

  const lines = trimmed.split('\n')
  const firstLine = lines.find((line) => line.trim() !== '') || ''
  const startsWithHeading = HEADING_RE.test(firstLine)

  const decorated = lines
    .map((line) => {
      const match = HEADING_RE.exec(line)
      if (!match) return line
      const heading = match[3].trim()
      if (STARTS_WITH_EMOJI.test(heading)) return line
      const emoji = emojiForHeading(heading)
      if (!emoji) return line
      return `${match[1]}${match[2]} ${emoji} ${heading}`
    })
    .join('\n')

  const opener = emojiForOpener(trimmed)
  if (opener && !startsWithHeading && !STARTS_WITH_EMOJI.test(decorated)) {
    return `${opener} ${decorated}`
  }

  return decorated
}