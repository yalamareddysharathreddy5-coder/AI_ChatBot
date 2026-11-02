// Jarvixss Chat - Main Application Logic
// Handles chat, UI interactions, API calls, and all features

import * as storage from './storage.js';
import * as ui from './ui.js';
import { initEmojiPicker, replaceShortcodes, triggerEmojiBurst, countEmojis } from './emoji.js';
import { initVoiceAssistant, speakMessage, collectVoiceSettings } from './voice.js';

// Application state
let currentSessionId = null;
let sessions = {};
let currentSettings = {};
let isGenerating = false;
let currentAbortController = null;
let attachedImages = [];
let userLocation = null; // {lat, lon}

// Initialize the app
function init() {
  // Load data from localStorage
  sessions = storage.loadSessions();
  currentSessionId = storage.loadCurrentSessionId();
  currentSettings = storage.loadSettings();
  
  // Apply settings
  applySettings();
  
  // Apply theme
  const theme = storage.loadTheme();
  document.documentElement.setAttribute('data-theme', theme);
  
  // Setup event listeners
  setupEventListeners();
  
  // Load draft
  loadDraftMessage();
  
  // Load or create session
  if (!currentSessionId || !sessions[currentSessionId]) {
    createNewSession();
  } else {
    loadCurrentSession();
  }
  
  // Render sidebar
  renderSidebar();
  
  // Add ripple effects
  document.querySelectorAll('.ripple').forEach(btn => {
    ui.addRippleEffect(btn);
  });

  initEmojiPicker();
  initVoiceAssistant({
    getSettings: () => currentSettings,
    sendMessage: sendVoiceMessage,
    getMessageText,
    updateSettings: patch => {
      currentSettings = { ...currentSettings, ...patch };
      storage.saveSettings(currentSettings);
    }
  });
}

function getMessageText(messageId) {
  const current = sessions[currentSessionId];
  const currentMessage = current?.messages.find(message => message.id === messageId);
  if (currentMessage) return currentMessage.content || '';
  for (const session of Object.values(sessions)) {
    const message = session.messages.find(item => item.id === messageId);
    if (message) return message.content || '';
  }
  return '';
}

async function sendVoiceMessage(text) {
  const input = document.getElementById('messageInput');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return handleSendMessage({ autoRead: false });
}

// Apply settings
function applySettings() {
  document.documentElement.style.fontSize = currentSettings.fontSize + 'px';
  document.documentElement.setAttribute('data-animation-intensity', currentSettings.animationIntensity || 'normal');
  document.documentElement.setAttribute('data-animations', currentSettings.animations === false ? 'off' : 'on');
  if (currentSettings.accentColor) {
    document.documentElement.style.setProperty('--accent-primary', currentSettings.accentColor);
  }
  
  if (!currentSettings.animations) {
    document.documentElement.style.setProperty('--animation-duration', '0s');
  } else {
    document.documentElement.style.removeProperty('--animation-duration');
  }
}

function hydrateSettingsForm() {
  const personality = document.getElementById('personalitySelect');
  const fontSize = document.getElementById('fontSizeRange');
  const accent = document.getElementById('accentColorSelect');
  const animations = document.getElementById('animationsToggle');
  const animationIntensity = document.getElementById('animationIntensity');
  const emojiAnimations = document.getElementById('emojiAnimationsToggle');
  const sounds = document.getElementById('soundsToggle');
  if (personality) personality.value = currentSettings.personality || 'friendly';
  if (fontSize) {
    fontSize.value = String(currentSettings.fontSize || 16);
    const label = document.getElementById('fontSizeValue');
    if (label) label.textContent = fontSize.value;
  }
  if (accent) accent.value = currentSettings.accentColor || '#6366f1';
  if (animations) animations.checked = currentSettings.animations !== false;
  if (animationIntensity) animationIntensity.value = currentSettings.animationIntensity || 'normal';
  if (emojiAnimations) emojiAnimations.checked = currentSettings.emojiAnimations !== false;
  if (sounds) sounds.checked = !!currentSettings.sounds;
}

// Setup all event listeners
function setupEventListeners() {
  // Send button
  document.getElementById('sendBtn').addEventListener('click', () => handleSendMessage());
  
  // Message input
  const messageInput = document.getElementById('messageInput');
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  messageInput.addEventListener('input', () => {
    // Auto-resize
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    
    // Save draft
    saveDraftMessage();
  });
  
  // New chat
  document.getElementById('newChatBtn').addEventListener('click', createNewSession);
  document.getElementById('newChatHeaderBtn').addEventListener('click', createNewSession);
  
  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
  
  // Clear chat
  document.getElementById('clearChatBtn').addEventListener('click', clearCurrentChat);
  
  // Regenerate
  document.getElementById('regenerateBtn').addEventListener('click', regenerateResponse);
  
  // Stop generating
  document.getElementById('stopBtn').addEventListener('click', stopGenerating);
  
  // Upload image
  document.getElementById('uploadImageBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
  });
  
  document.getElementById('imageInput').addEventListener('change', handleImageUpload);
  
  // Paste image
  document.getElementById('messageInput').addEventListener('paste', handleImagePaste);
  
  // Drag and drop
  const chatContainer = document.querySelector('.main-content');
  chatContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  chatContainer.addEventListener('drop', handleImageDrop);
  
  // Voice input
  document.getElementById('voiceInputBtn').addEventListener('click', startVoiceInput);
  
  // Theme toggle
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Use my location
  const locBtn = document.getElementById('useLocationBtn');
  if (locBtn) {
    locBtn.addEventListener('click', getUserLocation);
  }
  
  // Settings
  document.getElementById('settingsBtn').addEventListener('click', () => {
    hydrateSettingsForm();
    ui.openModal('settingsModal');
  });
  
  // Settings modal
  document.getElementById('closeSettingsBtn').addEventListener('click', () => ui.closeModal('settingsModal'));
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('clearAllDataBtn').addEventListener('click', clearAllData);
  
  // Export chat
  document.getElementById('exportTxtBtn').addEventListener('click', exportChatAsTxt);
  document.getElementById('exportJsonBtn').addEventListener('click', exportChatAsJson);
  
  // Suggested prompts
  document.querySelectorAll('.suggest-prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      document.getElementById('messageInput').value = prompt;
      document.getElementById('messageInput').dispatchEvent(new Event('input'));
      document.querySelector('.welcome-screen').style.display = 'none';
      document.getElementById('messageInput').focus();
    });
  });
  
  // Sidebar search
  document.getElementById('sidebarSearch').addEventListener('input', (e) => {
    renderSidebar(e.target.value);
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+K for new chat
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      createNewSession();
    }
    // Esc to close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
      });
    }
  });
  
  // Click outside modal to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// Create new session
function createNewSession() {
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  sessions[sessionId] = {
    id: sessionId,
    name: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  currentSessionId = sessionId;
  storage.saveSessions(sessions);
  storage.saveCurrentSessionId(currentSessionId);
  
  renderSidebar();
  loadCurrentSession();
  ui.showToast('New chat created', 'success');
}

// Load current session
function loadCurrentSession() {
  const session = sessions[currentSessionId];
  if (!session) return;
  
  const messagesContainer = document.getElementById('chatMessages');
  const welcomeScreen = document.getElementById('welcomeScreen');

  // Remove only rendered messages/indicators, keep the welcome screen in the DOM
  messagesContainer.querySelectorAll('.message, .typing-indicator').forEach(el => el.remove());
  
  if (session.messages.length === 0) {
    welcomeScreen.style.display = 'flex';
  } else {
    welcomeScreen.style.display = 'none';
    session.messages.forEach(msg => {
      const msgEl = ui.createMessageElement(msg, msg.role === 'user');
      messagesContainer.appendChild(msgEl);
      if (msg.role === 'assistant') {
        renderRichContent(msgEl, msg.content);
      }
    });
  }
  
  ui.scrollToBottom(messagesContainer);
  document.getElementById('currentChatName').textContent = session.name;
  document.getElementById('regenerateBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'none';
}

// Render sidebar
function renderSidebar(searchTerm = '') {
  const container = document.getElementById('chatSessions');
  container.innerHTML = '';
  
  const sessionList = Object.values(sessions)
    .filter(s => {
      if (!searchTerm) return true;
      return s.name.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
  
  sessionList.forEach(session => {
    const item = document.createElement('div');
    item.className = `chat-session-item ${session.id === currentSessionId ? 'active' : ''}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-session-name';
    nameSpan.textContent = session.name;
    
    const actions = document.createElement('div');
    actions.className = 'chat-session-actions';
    
    const renameBtn = document.createElement('button');
    renameBtn.textContent = '✏️';
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      renameSession(session.id);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteSession(session.id);
    };
    
    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(nameSpan);
    item.appendChild(actions);
    
    item.onclick = () => {
      switchSession(session.id);
    };
    
    container.appendChild(item);
  });
}

// Switch session
function switchSession(sessionId) {
  currentSessionId = sessionId;
  storage.saveCurrentSessionId(currentSessionId);
  renderSidebar();
  loadCurrentSession();
  
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('mobile-open');
}

// Rename session
function renameSession(sessionId) {
  const session = sessions[sessionId];
  const newName = prompt('Enter new chat name:', session.name);
  if (newName && newName.trim()) {
    session.name = newName.trim();
    session.updatedAt = Date.now();
    storage.saveSessions(sessions);
    renderSidebar();
    if (sessionId === currentSessionId) {
      document.getElementById('currentChatName').textContent = session.name;
    }
    ui.showToast('Chat renamed', 'success');
  }
}

// Delete session
function deleteSession(sessionId) {
  if (confirm('Are you sure you want to delete this chat?')) {
    delete sessions[sessionId];
    storage.saveSessions(sessions);
    
    if (sessionId === currentSessionId) {
      const remaining = Object.keys(sessions);
      if (remaining.length > 0) {
        switchSession(remaining[0]);
      } else {
        createNewSession();
      }
    }
    renderSidebar();
    ui.showToast('Chat deleted', 'success');
  }
}

// Toggle sidebar
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

// Handle send message
async function handleSendMessage({ autoRead = true } = {}) {
  const input = document.getElementById('messageInput');
  const rawMessage = input.value.trim();
  const message = replaceShortcodes(rawMessage);

  if ((!message && attachedImages.length === 0) || isGenerating) return null;
  
  // Hide welcome screen
  document.querySelector('.welcome-screen').style.display = 'none';
  
  // Add user message
  const userMessage = {
    id: 'msg_' + Date.now(),
    role: 'user',
    content: message,
    timestamp: ui.formatTimestamp(),
    image: attachedImages[0] || null
  };
  
  sessions[currentSessionId].messages.push(userMessage);
  sessions[currentSessionId].updatedAt = Date.now();
  
  // Update session name if it's the first message
  if (sessions[currentSessionId].messages.length === 1 && sessions[currentSessionId].name === 'New Chat') {
    sessions[currentSessionId].name = message.substring(0, 30) + (message.length > 30 ? '...' : '');
  }
  
  storage.saveSessions(sessions);
  
  // Render user message
  const messagesContainer = document.getElementById('chatMessages');
  const userMsgEl = ui.createMessageElement(userMessage, true);
  messagesContainer.appendChild(userMsgEl);
  ui.scrollToBottom(messagesContainer);

  if (countEmojis(message) > 0) {
    triggerEmojiBurst();
  }

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  attachedImages = [];
  document.getElementById('imagePreviewContainer').innerHTML = '';
  
  // Save draft
  saveDraftMessage();
  renderSidebar();
  
  // Show typing indicator and generate response
  return generateResponse({ autoRead });
}

// Generate AI response
async function generateResponse({ autoRead = true } = {}) {
  const session = sessions[currentSessionId];
  if (!session || session.messages.length === 0 || isGenerating) return null;

  isGenerating = true;
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('regenerateBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'inline-block';
  
  const messagesContainer = document.getElementById('chatMessages');
  const typingIndicator = ui.createTypingIndicator();
  messagesContainer.appendChild(typingIndicator);
  ui.scrollToBottom(messagesContainer);
  
  currentAbortController = new AbortController();
  
  try {
    // Get last 20 messages for context
    const contextMessages = session.messages.slice(-20).map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Add location context if available
    if (userLocation && contextMessages.length > 0) {
      const lastUser = [...contextMessages].reverse().find(m => m.role === 'user');
      if (lastUser && /restaurant|near me|nearby|food|cafe|hotel/i.test(lastUser.content || '')) {
        contextMessages.push({
          role: 'user',
          content: `[User location context: lat=${userLocation.lat}, lon=${userLocation.lon}. Consider nearby places if relevant.]`
        });
      }
    }
    
    // Get personality from settings
    const personality = currentSettings.personality || 'friendly';
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: contextMessages,
        personality: personality,
        image: session.messages[session.messages.length - 1].image
      }),
      signal: currentAbortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Remove typing indicator
    const typingEl = document.getElementById('typingIndicator');
    if (typingEl) typingEl.remove();
    
    // Add bot message
    const botMessage = {
      id: 'msg_' + Date.now(),
      role: 'assistant',
      content: data.message || 'Sorry, I encountered an error.',
      timestamp: ui.formatTimestamp(),
      image: null
    };
    
    session.messages.push(botMessage);
    session.updatedAt = Date.now();
    storage.saveSessions(sessions);
    
    const botMsgEl = ui.createMessageElement(botMessage, false);
    messagesContainer.appendChild(botMsgEl);
    // Render rich tags after adding to DOM
    renderRichContent(botMsgEl, botMessage.content);
    ui.scrollToBottom(messagesContainer);
    
    document.getElementById('regenerateBtn').style.display = 'inline-block';
    if (autoRead && currentSettings.autoRead) speakMessage(botMessage.id);
    return botMessage.content;
    
  } catch (error) {
    // Remove typing indicator
    const typingEl = document.getElementById('typingIndicator');
    if (typingEl) typingEl.remove();

    if (error.name === 'AbortError') {
      ui.showToast('Generation stopped', 'info');
    } else {
      console.error('Error generating response:', error);
      const botMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: '⚠️ Sorry, I\'m having trouble connecting. Let me try in demo mode...\n\nHello! I\'m Jarvixss Chat, your AI assistant. I can help you with general knowledge, coding, homework, travel planning, and much more. What would you like to discuss today?',
        timestamp: ui.formatTimestamp(),
        image: null
      };

      sessions[currentSessionId].messages.push(botMessage);
      sessions[currentSessionId].updatedAt = Date.now();
      storage.saveSessions(sessions);

      const botMsgEl = ui.createMessageElement(botMessage, false);
      messagesContainer.appendChild(botMsgEl);
      renderRichContent(botMsgEl, botMessage.content);
      ui.scrollToBottom(messagesContainer);

      ui.showToast('Using demo mode', 'warning');
      if (autoRead && currentSettings.autoRead) speakMessage(botMessage.id);
      return botMessage.content;
    }
  } finally {
    isGenerating = false;
    currentAbortController = null;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('regenerateBtn').style.display = 'inline-block';
  }

  return null;
}

// Regenerate response
function regenerateResponse() {
  const session = sessions[currentSessionId];
  // Remove last bot message if exists
  if (session.messages.length > 0 && session.messages[session.messages.length - 1].role === 'assistant') {
    session.messages.pop();
    storage.saveSessions(sessions);
    loadCurrentSession();
  }
  generateResponse();
}

// Stop generating
function stopGenerating() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
}

// Handle image upload
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    ui.showToast('Image must be less than 5MB', 'error');
    return;
  }
  
  try {
    const compressed = await storage.compressImage(file, 500);
    attachedImages = [compressed];
    
    // Show preview
    const previewContainer = document.getElementById('imagePreviewContainer');
    previewContainer.innerHTML = '';
    
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    
    const img = document.createElement('img');
    img.src = compressed;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
      attachedImages = [];
      previewContainer.innerHTML = '';
    };
    
    preview.appendChild(img);
    preview.appendChild(removeBtn);
    previewContainer.appendChild(preview);
    
    ui.showToast('Image attached', 'success');
  } catch (error) {
    console.error('Error uploading image:', error);
    ui.showToast('Error uploading image', 'error');
  }
  
  e.target.value = '';
}

// Handle image paste
async function handleImagePaste(e) {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      e.preventDefault();
      const file = items[i].getAsFile();
      if (file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        document.getElementById('imageInput').files = dataTransfer.files;
        document.getElementById('imageInput').dispatchEvent(new Event('change'));
      }
      break;
    }
  }
}

// Handle image drop
async function handleImageDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.indexOf('image') !== -1) {
    if (files[0].size > 5 * 1024 * 1024) {
      ui.showToast('Image must be less than 5MB', 'error');
      return;
    }
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(files[0]);
    document.getElementById('imageInput').files = dataTransfer.files;
    document.getElementById('imageInput').dispatchEvent(new Event('change'));
  }
}

// Start voice input
function startVoiceInput() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      document.getElementById('voiceInputBtn').classList.add('active');
      ui.showToast('Listening...', 'info');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('messageInput').value = transcript;
      document.getElementById('messageInput').dispatchEvent(new Event('input'));
    };
    
    recognition.onerror = () => {
      ui.showToast('Voice input error', 'error');
    };
    
    recognition.onend = () => {
      document.getElementById('voiceInputBtn').classList.remove('active');
    };
    
    recognition.start();
  } else {
    ui.showToast('Voice input not supported', 'warning');
  }
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  storage.saveTheme(newTheme);
  ui.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
}

// Get user location
function getUserLocation() {
  if (!navigator.geolocation) {
    ui.showToast('Geolocation not supported', 'warning');
    return;
  }
  ui.showToast('Requesting location...', 'info');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      };
      ui.showToast('Location obtained', 'success');
      // Show location map
      showUserLocationMap(userLocation);
    },
    (err) => {
      console.error('Geolocation error:', err);
      ui.showToast('Location access denied or unavailable', 'warning');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function showUserLocationMap(loc) {
  const messagesContainer = document.getElementById('chatMessages');
  const card = document.createElement('div');
  card.className = 'map-card';
  card.style.margin = '1rem';
  
  const title = document.createElement('div');
  title.className = 'map-card-title';
  title.textContent = '📍 Your Location';
  card.appendChild(title);
  
  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  mapDiv.id = 'user-loc-map-' + Date.now();
  card.appendChild(mapDiv);
  
  const actions = document.createElement('div');
  actions.className = 'map-card-actions';
  
  const gmapsBtn = document.createElement('button');
  gmapsBtn.className = 'map-action-btn';
  gmapsBtn.textContent = 'Open in Google Maps';
  gmapsBtn.onclick = () => window.open(`https://maps.google.com/?q=${loc.lat},${loc.lon}`, '_blank');
  
  const dirBtn = document.createElement('button');
  dirBtn.className = 'map-action-btn';
  dirBtn.textContent = 'Get directions';
  dirBtn.onclick = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}`, '_blank');
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'map-action-btn';
  copyBtn.textContent = 'Copy coordinates';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(`${loc.lat}, ${loc.lon}`).then(() => ui.showToast('Coordinates copied', 'success'));
  };
  
  actions.appendChild(gmapsBtn);
  actions.appendChild(dirBtn);
  actions.appendChild(copyBtn);
  card.appendChild(actions);
  
  messagesContainer.appendChild(card);
  ui.scrollToBottom(messagesContainer);
  
  setTimeout(() => {
    if (typeof L !== 'undefined') {
      const map = L.map(mapDiv.id).setView([loc.lat, loc.lon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      L.marker([loc.lat, loc.lon]).addTo(map).bindPopup('You are here').openPopup();
    }
  }, 100);
}

// Render rich content (maps and images) for bot messages
async function renderRichContent(messageEl, content) {
  const bubble = messageEl.querySelector('.message-bubble');
  if (!bubble || !content) return;
  
  const tags = ui.extractRichTags(content);
  
  // Render maps
  if (tags.maps.length > 0) {
    for (const query of tags.maps) {
      await renderMapCard(bubble, query);
    }
  }
  
  // Render images
  if (tags.images.length > 0) {
    await renderImageGallery(bubble, tags.images);
  }
}

async function renderMapCard(bubble, query) {
  const card = document.createElement('div');
  card.className = 'map-card';
  
  const title = document.createElement('div');
  title.className = 'map-card-title';
  title.textContent = `🗺️ ${ui.escapeHtml(query)}`;
  card.appendChild(title);
  
  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  mapDiv.id = 'map-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  card.appendChild(mapDiv);
  
  const skeleton = document.createElement('div');
  skeleton.className = 'map-skeleton';
  skeleton.textContent = 'Loading map...';
  mapDiv.appendChild(skeleton);
  
  const actions = document.createElement('div');
  actions.className = 'map-card-actions';
  card.appendChild(actions);
  
  bubble.appendChild(card);
  
  // Check cache
  const cacheKey = 'nominatim:' + query.toLowerCase();
  let coords = null;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      coords = JSON.parse(cached);
    }
  } catch {}
  
  if (!coords) {
    try {
      // Rate limit - simple delay
      await new Promise(r => setTimeout(r, 1000));
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: {
          'User-Agent': 'JarvixssChat/1.0'
        }
      });
      const data = await resp.json();
      if (data && data[0]) {
        coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(coords));
        } catch {}
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
  }
  
  skeleton.remove();
  
  if (!coords) {
    const msg = document.createElement('div');
    msg.className = 'map-error';
    msg.textContent = 'Could not load map for this location.';
    mapDiv.appendChild(msg);
    return;
  }
  
  // Render map
  setTimeout(() => {
    if (typeof L !== 'undefined') {
      try {
        const map = L.map(mapDiv.id).setView([coords.lat, coords.lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        L.marker([coords.lat, coords.lon]).addTo(map).bindPopup(coords.display_name || query).openPopup();
        
        // Add actions
        const gmapsBtn = document.createElement('button');
        gmapsBtn.className = 'map-action-btn';
        gmapsBtn.textContent = 'Open in Google Maps';
        gmapsBtn.onclick = () => window.open(`https://maps.google.com/?q=${coords.lat},${coords.lon}`, '_blank');
        
        const dirBtn = document.createElement('button');
        dirBtn.className = 'map-action-btn';
        dirBtn.textContent = 'Get directions';
        dirBtn.onclick = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`, '_blank');
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'map-action-btn';
        copyBtn.textContent = 'Copy coordinates';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(`${coords.lat}, ${coords.lon}`).then(() => ui.showToast('Coordinates copied', 'success'));
        };
        
        actions.appendChild(gmapsBtn);
        actions.appendChild(dirBtn);
        actions.appendChild(copyBtn);
      } catch (e) {
        console.error('Leaflet error:', e);
        const msg = document.createElement('div');
        msg.className = 'map-error';
        msg.textContent = 'Could not render map.';
        mapDiv.appendChild(msg);
      }
    }
  }, 50);
}

async function renderImageGallery(bubble, queries) {
  for (const q of queries) {
    const gallery = document.createElement('div');
    gallery.className = 'image-gallery';
    
    const title = document.createElement('div');
    title.className = 'image-gallery-title';
    title.textContent = `🖼️ ${ui.escapeHtml(q)}`;
    gallery.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'image-gallery-grid';
    gallery.appendChild(grid);
    
    const skeleton = document.createElement('div');
    skeleton.className = 'image-skeleton';
    skeleton.textContent = 'Loading images...';
    grid.appendChild(skeleton);
    
    bubble.appendChild(gallery);
    
    try {
      const resp = await fetch(`/api/image?q=${encodeURIComponent(q)}`);
      const data = await resp.json();
      const results = data.results || [];
      skeleton.remove();
      
      if (results.length === 0) {
        gallery.style.display = 'none';
        continue;
      }
      
      for (const imgData of results) {
        const item = document.createElement('div');
        item.className = 'image-gallery-item';
        
        const img = document.createElement('img');
        img.className = 'image-gallery-img';
        img.src = imgData.thumbnailUrl || imgData.imageUrl;
        img.loading = 'lazy';
        img.alt = imgData.title || q;
        
        img.onclick = () => openLightbox(imgData.imageUrl, imgData.credit || imgData.author);
        
        const credit = document.createElement('div');
        credit.className = 'image-credit';
        const link = document.createElement('a');
        link.href = imgData.source || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = imgData.credit || imgData.author || 'Source';
        credit.appendChild(link);
        
        const dlBtn = document.createElement('button');
        dlBtn.className = 'image-dl-btn';
        dlBtn.textContent = 'Download';
        dlBtn.onclick = async (e) => {
          e.stopPropagation();
          try {
            const r = await fetch(imgData.imageUrl);
            const blob = await r.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = blob.type.split('/')[1] || 'jpg';
            a.download = `jarvixss-image-${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            ui.showToast('Image downloaded', 'success');
          } catch (err) {
            console.error('Download error:', err);
            ui.showToast('Download failed', 'error');
          }
        };
        
        item.appendChild(img);
        item.appendChild(credit);
        item.appendChild(dlBtn);
        grid.appendChild(item);
      }
    } catch (e) {
      console.error('Image fetch error:', e);
      skeleton.remove();
      gallery.style.display = 'none';
    }
  }
}

function openLightbox(url, credit) {
  if (!ui.isHttpsUrl(url)) return;
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.onclick = () => lb.remove();
  
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Enlarged image';
  img.onclick = (e) => e.stopPropagation();
  
  const cred = document.createElement('div');
  cred.className = 'lightbox-credit';
  cred.textContent = credit ? `Credit: ${credit}` : '';
  cred.onclick = (e) => e.stopPropagation();
  
  lb.appendChild(img);
  if (credit) lb.appendChild(cred);
  document.body.appendChild(lb);
}

// Save settings
function saveSettings() {
  currentSettings = {
    ...currentSettings,
    personality: document.getElementById('personalitySelect').value,
    fontSize: parseInt(document.getElementById('fontSizeRange').value),
    accentColor: document.getElementById('accentColorSelect').value,
    animations: document.getElementById('animationsToggle').checked,
    animationIntensity: document.getElementById('animationIntensity').value,
    emojiAnimations: document.getElementById('emojiAnimationsToggle').checked,
    sounds: document.getElementById('soundsToggle').checked,
    ...collectVoiceSettings()
  };
  
  storage.saveSettings(currentSettings);
  applySettings();
  ui.closeModal('settingsModal');
  ui.showToast('Settings saved', 'success');
}

// Clear current chat
function clearCurrentChat() {
  if (confirm('Are you sure you want to clear this chat?')) {
    sessions[currentSessionId].messages = [];
    sessions[currentSessionId].updatedAt = Date.now();
    storage.saveSessions(sessions);
    loadCurrentSession();
    document.querySelector('.welcome-screen').style.display = 'flex';
    ui.showToast('Chat cleared', 'success');
  }
}

// Clear all data
function clearAllData() {
  if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
    storage.clearAllData();
    location.reload();
  }
}

// Export chat as TXT
function exportChatAsTxt() {
  const session = sessions[currentSessionId];
  ui.downloadChatAsText(session.messages, session.name);
}

// Export chat as JSON
function exportChatAsJson() {
  const session = sessions[currentSessionId];
  ui.downloadChatAsJson(session.messages, session.name);
}

// Save draft message
function saveDraftMessage() {
  const draft = {
    text: document.getElementById('messageInput').value,
    images: attachedImages
  };
  storage.saveDraft(draft);
}

// Load draft message
function loadDraftMessage() {
  const draft = storage.loadDraft();
  if (draft.text) {
    document.getElementById('messageInput').value = draft.text;
    document.getElementById('messageInput').dispatchEvent(new Event('input'));
  }
  if (draft.images && draft.images.length > 0) {
    attachedImages = draft.images;
    const previewContainer = document.getElementById('imagePreviewContainer');
    previewContainer.innerHTML = '';
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    const img = document.createElement('img');
    img.src = draft.images[0];
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
      attachedImages = [];
      previewContainer.innerHTML = '';
    };
    preview.appendChild(img);
    preview.appendChild(removeBtn);
    previewContainer.appendChild(preview);
  }
}

// Make copyCode available globally
window.copyCode = ui.copyCode;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
