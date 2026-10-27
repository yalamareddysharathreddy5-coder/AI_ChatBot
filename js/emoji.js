// Jarvixss Chat - Emoji System
// Custom emoji picker with reactions, shortcodes, and animations

export const EMOJI_CATEGORIES = [
  { id: 'smileys', name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { id: 'gestures', name: 'Gestures', emojis: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙'] },
  { id: 'hearts', name: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { id: 'animals', name: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴'] },
  { id: 'food', name: 'Food', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔'] },
  { id: 'travel', name: 'Travel', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝'] },
  { id: 'activities', name: 'Activities', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','⛸️','🥌','🛹'] },
  { id: 'objects', name: 'Objects', emojis: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️'] },
  { id: 'symbols', name: 'Symbols', emojis: ['❤️','✨','🔥','💯','✅','❌','⚠️','💡','🔔','🔕','🔒','🔓','🔑','🔨','🔧','⚙️','🔗','📎','📌','📍','🚩','🏳️','🏴','🏁','🔴','🟠','🟡','🟢','🔵','🟣'] },
  { id: 'flags', name: 'Flags', emojis: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇮🇳','🇺🇸','🇬🇧','🇯🇵','🇰🇷','🇨🇳','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇷🇺','🇧🇷','🇨🇦','🇦🇺'] }
];

export const SHORTCODES = {
  ':smile:': '😀', ':grin:': '😁', ':laugh:': '😂', ':joy:': '😂', ':rofl:': '🤣',
  ':heart:': '❤️', ':love:': '😍', ':kiss:': '😘', ':wink:': '😉',
  ':fire:': '🔥', ':rocket:': '🚀', ':star:': '⭐', ':sparkles:': '✨',
  ':thumbsup:': '👍', ':thumbsdown:': '👎', ':ok:': '👌', ':clap:': '👏',
  ':party:': '🥳', ':congrats:': '🎉', ':tada:': '🎉', ':birthday:': '🎂',
  ':sad:': '😢', ':cry:': '😭', ':angry:': '😡', ':thinking:': '🤔',
  ':cool:': '😎', ':nerd:': '🤓', ':surprised:': '😮', ':shocked:': '😲'
};

const STORAGE_KEYS = {
  RECENT: 'jarvixss_emoji_recent',
  REACTIONS: 'jarvixss_emoji_reactions',
  SKIN_TONE: 'jarvixss_emoji_skin'
};

export function getRecentEmojis() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addRecentEmoji(emoji) {
  try {
    let recent = getRecentEmojis();
    recent = recent.filter(e => e !== emoji);
    recent.unshift(emoji);
    if (recent.length > 24) recent = recent.slice(0, 24);
    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recent));
  } catch {}
}

export function getSkinTone() {
  try {
    return localStorage.getItem(STORAGE_KEYS.SKIN_TONE) || '';
  } catch {
    return '';
  }
}

export function setSkinTone(tone) {
  try {
    localStorage.setItem(STORAGE_KEYS.SKIN_TONE, tone);
  } catch {}
}

export function replaceShortcodes(text) {
  if (!text) return text;
  let result = text;
  for (const [code, emoji] of Object.entries(SHORTCODES)) {
    result = result.replaceAll(code, emoji);
  }
  return result;
}

export function autocompleteShortcodes(text, caretPos) {
  if (!text || caretPos < 0) return null;
  const before = text.substring(0, caretPos);
  const match = before.match(/:([a-zA-Z0-9_]{2,})$/);
  if (!match) return null;
  const query = match[1].toLowerCase();
  const suggestions = [];
  for (const [code, emoji] of Object.entries(SHORTCODES)) {
    if (code.includes(':' + query)) {
      suggestions.push({ code, emoji });
    }
  }
  return suggestions.slice(0, 6);
}

export function applyShortcode(text, caretPos, code) {
  const before = text.substring(0, caretPos);
  const match = before.match(/:([a-zA-Z0-9_]{2,})$/);
  if (!match) return text;
  const start = before.lastIndexOf(':');
  const emoji = SHORTCODES[code] || '';
  return text.substring(0, start) + emoji + text.substring(caretPos);
}

export function getReactions(messageId) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REACTIONS);
    const all = data ? JSON.parse(data) : {};
    return all[messageId] || {};
  } catch {
    return {};
  }
}

export function addReaction(messageId, emoji) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REACTIONS);
    const all = data ? JSON.parse(data) : {};
    if (!all[messageId]) all[messageId] = {};
    if (!all[messageId][emoji]) all[messageId][emoji] = 0;
    all[messageId][emoji]++;
    localStorage.setItem(STORAGE_KEYS.REACTIONS, JSON.stringify(all));
    return all[messageId];
  } catch {
    return {};
  }
}

export function countEmojis(text) {
  if (!text) return 0;
  // Simple emoji regex
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = text.match(emojiRegex);
  if (!matches) return 0;
  // Count only if message is mostly emojis
  const stripped = text.replace(emojiRegex, '').replace(/\s/g, '');
  if (stripped.length === 0) return matches.length;
  return 0;
}

export function triggerEmojiBurst(keywords = []) {
  const settings = localStorage.getItem('jarvixss_settings');
  let emojiAnimations = true;
  try {
    if (settings) {
      const s = JSON.parse(settings);
      if (s.emojiAnimations === false) emojiAnimations = false;
    }
  } catch {}
  
  if (!emojiAnimations) return;
  
  const burstEmojis = ['🎉','✨','🔥','❤️','💚','💙','💛','🥳'];
  const count = Math.min(6, burstEmojis.length);
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'emoji-burst';
      el.textContent = burstEmojis[Math.floor(Math.random() * burstEmojis.length)];
      el.style.left = Math.random() * 80 + 10 + '%';
      el.style.animationDelay = Math.random() * 0.2 + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }, i * 100);
  }
}
