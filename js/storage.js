// NovaChat - localStorage Helpers
// All localStorage operations with error handling and data compression

const STORAGE_KEYS = {
  SESSIONS: 'novachat_sessions',
  CURRENT_SESSION: 'novachat_current_session',
  THEME: 'novachat_theme',
  SETTINGS: 'novachat_settings',
  DRAFT: 'novachat_draft'
};

// Save all chat sessions
export function saveSessions(sessions) {
  try {
    // For sessions with images, we may need to compress
    const serialized = JSON.stringify(sessions);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, serialized);
    return true;
  } catch (error) {
    console.error('Error saving sessions to localStorage:', error);
    // Try to handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      // Remove old sessions to make space
      try {
        const sessionsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '{}');
        const sessionIds = Object.keys(sessionsData);
        // Keep only the most recent 10 sessions
        if (sessionIds.length > 10) {
          const sortedSessions = sessionIds
            .map(id => ({ id, time: sessionsData[id].updatedAt || 0 }))
            .sort((a, b) => b.time - a.time)
            .slice(0, 10)
            .map(s => s.id);
          
          const trimmedSessions = {};
          sortedSessions.forEach(id => {
            trimmedSessions[id] = sessionsData[id];
          });
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(trimmedSessions));
          // Try saving again
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
          return true;
        }
      } catch (e) {
        console.error('Error trimming sessions:', e);
      }
    }
    return false;
  }
}

// Load all chat sessions
export function loadSessions() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!data) return {};
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sessions from localStorage:', error);
    return {};
  }
}

// Save current session ID
export function saveCurrentSessionId(sessionId) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, sessionId);
    return true;
  } catch (error) {
    console.error('Error saving current session:', error);
    return false;
  }
}

// Load current session ID
export function loadCurrentSessionId() {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  } catch (error) {
    console.error('Error loading current session:', error);
    return null;
  }
}

// Save theme
export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    return true;
  } catch (error) {
    console.error('Error saving theme:', error);
    return false;
  }
}

// Load theme
export function loadTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  } catch (error) {
    console.error('Error loading theme:', error);
    return 'dark';
  }
}

// Save settings
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Load settings
export function loadSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(data) };
  } catch (error) {
    console.error('Error loading settings:', error);
    return getDefaultSettings();
  }
}

// Get default settings
function getDefaultSettings() {
  return {
    personality: 'friendly',
    fontSize: 16,
    accentColor: '#6366f1',
    animations: true,
    sounds: false
  };
}

// Save draft message
export function saveDraft(draft) {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    return false;
  }
}

// Load draft message
export function loadDraft() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DRAFT);
    if (!data) return { text: '', images: [] };
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading draft:', error);
    return { text: '', images: [] };
  }
}

// Compress image to reduce size (target ~300KB)
export function compressImage(file, maxSizeKB = 300) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Scale down if too large
        const maxDimension = 1024;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels
        let quality = 0.8;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        let sizeKB = (compressedDataUrl.length * 0.75) / 1024;
        
        while (sizeKB > maxSizeKB && quality > 0.1) {
          quality -= 0.1;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          sizeKB = (compressedDataUrl.length * 0.75) / 1024;
        }
        
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Clear all data
export function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}
