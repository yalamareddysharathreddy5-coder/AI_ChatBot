// Jarvixss Chat - Emoji System
// Custom emoji picker with reactions, shortcodes, and animations

export const EMOJI_CATEGORIES = [
  { id: 'smileys', name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { id: 'gestures', name: 'Gestures', emojis: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','🤝','🙏','💪','🦾','🫶'] },
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

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];
const SKIN_TONE_OPTIONS = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
const SKIN_TONE_BASES = {
  '👍': ['👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿'],
  '👎': ['👎', '👎🏻', '👎🏼', '👎🏽', '👎🏾', '👎🏿'],
  '👌': ['👌', '👌🏻', '👌🏼', '👌🏽', '👌🏾', '👌🏿'],
  '✌️': ['✌️', '✌🏻', '✌🏼', '✌🏽', '✌🏾', '✌🏿'],
  '🤞': ['🤞', '🤞🏻', '🤞🏼', '🤞🏽', '🤞🏾', '🤞🏿'],
  '🤟': ['🤟', '🤟🏻', '🤟🏼', '🤟🏽', '🤟🏾', '🤟🏿'],
  '🤘': ['🤘', '🤘🏻', '🤘🏼', '🤘🏽', '🤘🏾', '🤘🏿'],
  '🤙': ['🤙', '🤙🏻', '🤙🏼', '🤙🏽', '🤙🏾', '🤙🏿'],
  '👈': ['👈', '👈🏻', '👈🏼', '👈🏽', '👈🏾', '👈🏿'],
  '👉': ['👉', '👉🏻', '👉🏼', '👉🏽', '👉🏾', '👉🏿'],
  '👆': ['👆', '👆🏻', '👆🏼', '👆🏽', '👆🏾', '👆🏿'],
  '👇': ['👇', '👇🏻', '👇🏼', '👇🏽', '👇🏾', '👇🏿'],
  '☝️': ['☝️', '☝🏻', '☝🏼', '☝🏽', '☝🏾', '☝🏿'],
  '👋': ['👋', '👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿'],
  '🤚': ['🤚', '🤚🏻', '🤚🏼', '🤚🏽', '🤚🏾', '🤚🏿'],
  '🖐️': ['🖐️', '🖐🏻', '🖐🏼', '🖐🏽', '🖐🏾', '🖐🏿'],
  '✋': ['✋', '✋🏻', '✋🏼', '✋🏽', '✋🏾', '✋🏿'],
  '🖖': ['🖖', '🖖🏻', '🖖🏼', '🖖🏽', '🖖🏾', '🖖🏿'],
  '👏': ['👏', '👏🏻', '👏🏼', '👏🏽', '👏🏾', '👏🏿'],
  '🙌': ['🙌', '🙌🏻', '🙌🏼', '🙌🏽', '🙌🏾', '🙌🏿'],
  '🤝': ['🤝', '🤝🏻', '🤝🏼', '🤝🏽', '🤝🏾', '🤝🏿'],
  '🙏': ['🙏', '🙏🏻', '🙏🏼', '🙏🏽', '🙏🏾', '🙏🏿'],
  '💪': ['💪', '💪🏻', '💪🏼', '💪🏽', '💪🏾', '💪🏿']
};

const EXTRA_SEARCH_TERMS = {
  '😀': 'grinning happy smile', '😃': 'smiley happy smile', '😄': 'smile happy',
  '😁': 'grin happy', '😆': 'laughing happy', '😅': 'sweat smile', '🤣': 'rofl laugh',
  '😂': 'joy laugh tears', '🙂': 'slight smile', '🙃': 'upside down', '😉': 'wink',
  '😊': 'blush smile', '😇': 'halo angel', '🥰': 'love hearts', '😍': 'heart eyes love',
  '🤩': 'star struck', '😘': 'kiss', '😋': 'yum tasty', '😜': 'wink tongue',
  '🤔': 'thinking', '😎': 'cool sunglasses', '🥳': 'party celebrate', '🤓': 'nerd',
  '👍': 'thumbs up like yes', '👎': 'thumbs down dislike no', '👏': 'clap applause',
  '🙏': 'pray please thanks', '❤️': 'heart love red', '🔥': 'fire lit hot',
  '✨': 'sparkles magic', '🎉': 'party tada celebrate', '🎂': 'birthday cake',
  '🚀': 'rocket launch', '⭐': 'star', '💯': 'hundred perfect', '✅': 'check yes',
  '❌': 'cross no', '⚠️': 'warning', '💡': 'idea bulb', '🔔': 'bell notification',
  '📍': 'pin location', '🚩': 'flag', '🐶': 'dog puppy', '🐱': 'cat kitten',
  '🍎': 'apple fruit', '🍕': 'pizza food', '☕': 'coffee drink', '🎵': 'music note'
};

const emojiToShortcodes = {};
for (const [code, emoji] of Object.entries(SHORTCODES)) {
  const clean = code.replace(/:/g, ' ');
  if (!emojiToShortcodes[emoji]) emojiToShortcodes[emoji] = [];
  emojiToShortcodes[emoji].push(clean);
}

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
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = text.match(emojiRegex);
  if (!matches) return 0;
  const stripped = text.replace(emojiRegex, '').replace(/\s/g, '');
  if (stripped.length === 0) return matches.length;
  return matches.length;
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

let pickerEl = null;
let gridEl = null;
let tabsEl = null;
let recentEl = null;
let searchEl = null;
let autocompleteEl = null;
let inputEl = null;
let buttonEl = null;
let currentCategory = 'smileys';
let activeSkinTone = getSkinTone();
let pickerOpen = false;
let autocompleteSuggestions = [];
let autocompleteIndex = 0;
let reactionPickerEl = null;
let reactionPickerAnchor = null;
let observer = null;

function applyTone(emoji) {
  const variants = SKIN_TONE_BASES[emoji];
  if (!variants || !activeSkinTone) return emoji;
  const index = SKIN_TONE_OPTIONS.indexOf(activeSkinTone);
  return variants[index] || emoji;
}

function searchTextFor(emoji) {
  return [
    emoji,
    EXTRA_SEARCH_TERMS[emoji] || '',
    ...(emojiToShortcodes[emoji] || [])
  ].join(' ').toLowerCase();
}

function positionPicker() {
  if (!pickerEl || !buttonEl || window.innerWidth <= 640) return;
  const rect = buttonEl.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 16);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  pickerEl.style.left = left + 'px';
  pickerEl.style.bottom = Math.max(8, window.innerHeight - rect.top + 8) + 'px';
  pickerEl.style.width = width + 'px';
}

function openPicker() {
  if (!pickerEl) return;
  pickerOpen = true;
  pickerEl.classList.add('active');
  pickerEl.setAttribute('aria-hidden', 'false');
  buttonEl?.setAttribute('aria-expanded', 'true');
  renderRecent();
  renderGrid();
  positionPicker();
  setTimeout(() => searchEl?.focus(), 50);
}

function closePicker() {
  if (!pickerEl) return;
  pickerOpen = false;
  pickerEl.classList.remove('active');
  pickerEl.setAttribute('aria-hidden', 'true');
  buttonEl?.setAttribute('aria-expanded', 'false');
}

function togglePicker() {
  if (pickerOpen) closePicker();
  else openPicker();
}

function buildTabs() {
  if (!tabsEl) return;
  tabsEl.innerHTML = '';
  const items = [{ id: 'recent', name: 'Recent' }, ...EMOJI_CATEGORIES];
  for (const category of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-tab' + (category.id === currentCategory ? ' active' : '');
    button.dataset.category = category.id;
    button.textContent = category.name;
    tabsEl.appendChild(button);
  }
}

function renderRecent() {
  if (!recentEl) return;
  const recent = getRecentEmojis();
  recentEl.innerHTML = '';
  if (recent.length === 0) {
    recentEl.style.display = 'none';
    return;
  }
  recentEl.style.display = 'block';
  const label = document.createElement('div');
  label.className = 'emoji-recent-label';
  label.textContent = 'Recently used';
  recentEl.appendChild(label);
  const row = document.createElement('div');
  row.className = 'emoji-recent-row';
  for (const emoji of recent.slice(0, 16)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-btn';
    button.dataset.emoji = emoji;
    button.title = searchTextFor(emoji);
    button.textContent = applyTone(emoji);
    row.appendChild(button);
  }
  recentEl.appendChild(row);
}

function getVisibleEmojis() {
  const query = (searchEl?.value || '').trim().toLowerCase();
  if (query) {
    const all = [...new Set(EMOJI_CATEGORIES.flatMap(category => category.emojis))];
    return all.filter(emoji => searchTextFor(emoji).includes(query));
  }
  if (currentCategory === 'recent') {
    return getRecentEmojis();
  }
  const category = EMOJI_CATEGORIES.find(item => item.id === currentCategory);
  return category ? category.emojis : [];
}

function renderGrid() {
  if (!gridEl) return;
  const emojis = getVisibleEmojis();
  gridEl.innerHTML = '';
  if (emojis.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'emoji-empty';
    empty.textContent = 'No emojis found';
    gridEl.appendChild(empty);
    return;
  }
  for (const emoji of emojis) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-btn';
    button.dataset.emoji = emoji;
    button.title = searchTextFor(emoji);
    button.textContent = applyTone(emoji);
    gridEl.appendChild(button);
  }
}

function insertAtCursor(text) {
  if (!inputEl) return;
  const start = typeof inputEl.selectionStart === 'number' ? inputEl.selectionStart : inputEl.value.length;
  const end = typeof inputEl.selectionEnd === 'number' ? inputEl.selectionEnd : start;
  inputEl.value = inputEl.value.slice(0, start) + text + inputEl.value.slice(end);
  const caret = start + text.length;
  inputEl.selectionStart = inputEl.selectionEnd = caret;
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.focus();
}

function chooseEmoji(emoji) {
  const rendered = applyTone(emoji);
  insertAtCursor(rendered);
  addRecentEmoji(emoji);
  renderRecent();
  closeAutocomplete();
}

function hideAutocomplete() {
  if (autocompleteEl) {
    autocompleteEl.style.display = 'none';
    autocompleteEl.innerHTML = '';
  }
  autocompleteSuggestions = [];
  autocompleteIndex = 0;
}

function closeAutocomplete() {
  hideAutocomplete();
}

function positionAutocomplete() {
  if (!autocompleteEl || !inputEl) return;
  const rect = inputEl.getBoundingClientRect();
  autocompleteEl.style.left = Math.max(8, rect.left) + 'px';
  autocompleteEl.style.bottom = Math.max(8, window.innerHeight - rect.top + 6) + 'px';
}

function renderAutocomplete(suggestions) {
  if (!autocompleteEl) return;
  autocompleteSuggestions = suggestions || [];
  autocompleteIndex = 0;
  autocompleteEl.innerHTML = '';
  if (!autocompleteSuggestions.length) {
    autocompleteEl.style.display = 'none';
    return;
  }
  autocompleteSuggestions.forEach((suggestion, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-autocomplete-item' + (index === autocompleteIndex ? ' active' : '');
    button.dataset.code = suggestion.code;
    button.innerHTML = `<span>${suggestion.emoji}</span><span>${suggestion.code}</span>`;
    autocompleteEl.appendChild(button);
  });
  autocompleteEl.style.display = 'block';
  positionAutocomplete();
}

function chooseAutocomplete(code) {
  if (!inputEl) return;
  const caret = inputEl.selectionStart;
  const next = applyShortcode(inputEl.value, caret, code);
  if (next === inputEl.value) return;
  inputEl.value = next;
  const emoji = SHORTCODES[code] || '';
  const caretPos = Math.max(0, caret - (code.length + 1) + emoji.length);
  inputEl.selectionStart = inputEl.selectionEnd = caretPos;
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  addRecentEmoji(emoji);
  renderRecent();
  hideAutocomplete();
  inputEl.focus();
}

function handleInputForAutocomplete() {
  if (!inputEl || !autocompleteEl) return;
  const caret = inputEl.selectionStart;
  const suggestions = autocompleteShortcodes(inputEl.value, caret);
  if (suggestions && suggestions.length) {
    renderAutocomplete(suggestions);
  } else {
    hideAutocomplete();
  }
}

function updateSkinToneButtons() {
  document.querySelectorAll('.skin-tone-btn').forEach(button => {
    button.classList.toggle('active', (button.dataset.tone || '') === activeSkinTone);
  });
}

function closeReactionPicker() {
  if (reactionPickerEl) {
    reactionPickerEl.remove();
    reactionPickerEl = null;
  }
  reactionPickerAnchor = null;
}

function openReactionPicker(messageId, anchor) {
  closeReactionPicker();
  if (!messageId || !anchor) return;
  reactionPickerAnchor = anchor;
  reactionPickerEl = document.createElement('div');
  reactionPickerEl.className = 'emoji-reaction-picker';
  reactionPickerEl.dataset.messageId = messageId;
  for (const emoji of REACTION_EMOJIS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-reaction-option';
    button.dataset.emoji = emoji;
    button.textContent = emoji;
    reactionPickerEl.appendChild(button);
  }
  document.body.appendChild(reactionPickerEl);
  const rect = anchor.getBoundingClientRect();
  const width = 270;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 70));
  reactionPickerEl.style.left = left + 'px';
  reactionPickerEl.style.top = top + 'px';
}

function renderMessageReactions(messageEl) {
  if (!messageEl) return;
  const messageId = messageEl.dataset.messageId;
  if (!messageId) return;
  const container = messageEl.querySelector('.message-reactions');
  if (!container) return;
  const reactions = getReactions(messageId);
  container.innerHTML = '';
  for (const [emoji, count] of Object.entries(reactions)) {
    if (!count) continue;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'reaction-chip';
    chip.dataset.emoji = emoji;
    chip.textContent = `${emoji} ${count}`;
    container.appendChild(chip);
  }
}

function renderAllReactions() {
  document.querySelectorAll('.message').forEach(renderMessageReactions);
}

function handleReaction(messageId, emoji) {
  if (!messageId || !emoji) return;
  addReaction(messageId, emoji);
  const messageEl = document.querySelector(`.message[data-message-id="${CSS.escape(messageId)}"]`);
  if (messageEl) renderMessageReactions(messageEl);
  closeReactionPicker();
}

export function initEmojiPicker() {
  buttonEl = document.getElementById('emojiPickerBtn');
  pickerEl = document.getElementById('emojiPicker');
  gridEl = document.getElementById('emojiGrid');
  tabsEl = document.getElementById('emojiTabs');
  recentEl = document.getElementById('emojiRecent');
  searchEl = document.getElementById('emojiSearch');
  autocompleteEl = document.getElementById('emojiAutocomplete');
  inputEl = document.getElementById('messageInput');

  if (!buttonEl || !pickerEl || !gridEl || !tabsEl || !inputEl) return;

  buttonEl.setAttribute('aria-expanded', 'false');
  pickerEl.setAttribute('aria-hidden', 'true');
  buildTabs();
  renderRecent();
  renderGrid();
  updateSkinToneButtons();

  buttonEl.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    togglePicker();
  });

  searchEl?.addEventListener('input', renderGrid);

  tabsEl.addEventListener('click', event => {
    const button = event.target.closest('.emoji-tab');
    if (!button) return;
    currentCategory = button.dataset.category || 'smileys';
    tabsEl.querySelectorAll('.emoji-tab').forEach(tab => {
      tab.classList.toggle('active', tab === button);
    });
    if (searchEl) searchEl.value = '';
    renderGrid();
  });

  gridEl.addEventListener('click', event => {
    const button = event.target.closest('.emoji-btn');
    if (!button) return;
    chooseEmoji(button.dataset.emoji);
  });

  recentEl?.addEventListener('click', event => {
    const button = event.target.closest('.emoji-btn');
    if (!button) return;
    chooseEmoji(button.dataset.emoji);
  });

  document.querySelectorAll('.skin-tone-btn').forEach(button => {
    button.addEventListener('click', () => {
      activeSkinTone = button.dataset.tone || '';
      setSkinTone(activeSkinTone);
      updateSkinToneButtons();
      renderGrid();
      renderRecent();
    });
  });

  inputEl.addEventListener('input', handleInputForAutocomplete);
  inputEl.addEventListener('click', handleInputForAutocomplete);
  inputEl.addEventListener('keydown', event => {
    if (!autocompleteSuggestions.length) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      hideAutocomplete();
      return;
    }
    if (event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (event.key === 'Tab') {
        chooseAutocomplete(autocompleteSuggestions[autocompleteIndex].code);
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      autocompleteIndex = (autocompleteIndex + direction + autocompleteSuggestions.length) % autocompleteSuggestions.length;
      autocompleteEl.querySelectorAll('.emoji-autocomplete-item').forEach((item, index) => {
        item.classList.toggle('active', index === autocompleteIndex);
      });
    }
  });

  autocompleteEl?.addEventListener('click', event => {
    const button = event.target.closest('.emoji-autocomplete-item');
    if (!button) return;
    chooseAutocomplete(button.dataset.code);
  });

  document.addEventListener('click', event => {
    if (pickerOpen && pickerEl && !pickerEl.contains(event.target) && !buttonEl.contains(event.target)) {
      closePicker();
    }
    if (autocompleteEl && autocompleteEl.style.display === 'block' && !autocompleteEl.contains(event.target) && !inputEl.contains(event.target)) {
      hideAutocomplete();
    }
    const addReactionBtn = event.target.closest('.add-reaction-btn');
    if (addReactionBtn) {
      event.preventDefault();
      openReactionPicker(addReactionBtn.dataset.messageId, addReactionBtn);
      return;
    }
    const quickReactionBtn = event.target.closest('.quick-reaction-btn');
    if (quickReactionBtn) {
      event.preventDefault();
      handleReaction(quickReactionBtn.dataset.messageId, quickReactionBtn.dataset.reaction);
      return;
    }
    const reactionOption = event.target.closest('.emoji-reaction-option');
    if (reactionOption && reactionPickerEl) {
      event.preventDefault();
      handleReaction(reactionPickerEl.dataset.messageId, reactionOption.dataset.emoji);
      return;
    }
    const reactionChip = event.target.closest('.reaction-chip');
    if (reactionChip) {
      const messageEl = reactionChip.closest('.message');
      handleReaction(messageEl?.dataset.messageId, reactionChip.dataset.emoji);
      return;
    }
    if (reactionPickerEl && !reactionPickerEl.contains(event.target) && event.target !== reactionPickerAnchor) {
      closeReactionPicker();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closePicker();
      hideAutocomplete();
      closeReactionPicker();
    }
  });

  window.addEventListener('resize', () => {
    if (pickerOpen) positionPicker();
    if (autocompleteEl && autocompleteEl.style.display === 'block') positionAutocomplete();
    closeReactionPicker();
  });

  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.classList?.contains('message')) renderMessageReactions(node);
          node.querySelectorAll?.('.message').forEach(renderMessageReactions);
        }
      }
    });
    observer.observe(chatMessages, { childList: true, subtree: true });
  }

  renderAllReactions();
}
