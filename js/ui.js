// NovaChat - UI Helpers
// Rendering, toasts, modals, and DOM manipulation

// Create toast notification
export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type} fade-in`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentElement) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Open modal
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

// Close modal
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render markdown (basic: bold, lists, code blocks with copy button)
export function renderMarkdown(text) {
  if (!text) return '';
  
  // Escape HTML first for security
  let html = escapeHtml(text);
  
  // Code blocks (```language\ncode\n```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
    return `<pre><button class="copy-code-btn" onclick="copyCode('${codeId}')">Copy</button><code id="${codeId}" class="language-${lang || 'plaintext'}">${code}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Unordered lists
  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// Copy code to clipboard
export function copyCode(codeId) {
  const codeElement = document.getElementById(codeId);
  if (codeElement) {
    const text = codeElement.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Code copied!', 'success');
    }).catch(() => {
      showToast('Failed to copy code', 'error');
    });
  }
}

// Copy message to clipboard
export function copyMessage(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Message copied!', 'success');
  }).catch(() => {
    showToast('Failed to copy message', 'error');
  });
}

// Download image
export function downloadImage(dataUrl, filename = 'image.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Image downloaded!', 'success');
}

// Download chat as text
export function downloadChatAsText(messages, sessionName = 'chat') {
  let text = `NovaChat - ${sessionName}\n`;
  text += `Date: ${new Date().toLocaleString()}\n`;
  text += '='.repeat(50) + '\n\n';
  
  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'You' : 'Nova';
    text += `[${role}] ${msg.timestamp || ''}\n`;
    text += `${msg.content}\n\n`;
    if (msg.image) {
      text += '[Image attached]\n\n';
    }
  });
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `novachat-${sessionName.replace(/[^a-z0-9]/gi, '_')}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  showToast('Chat downloaded as TXT!', 'success');
}

// Download chat as JSON
export function downloadChatAsJson(messages, sessionName = 'chat') {
  const data = {
    app: 'NovaChat',
    sessionName,
    exportDate: new Date().toISOString(),
    messages
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `novachat-${sessionName.replace(/[^a-z0-9]/gi, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  showToast('Chat downloaded as JSON!', 'success');
}

// Add ripple effect to button
export function addRippleEffect(element) {
  element.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');
    
    this.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
}

// Scroll to bottom of chat
export function scrollToBottom(element) {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

// Format timestamp
export function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Create message element
export function createMessageElement(message, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'bot'} slide-in-${isUser ? 'right' : 'left'}`;
  messageDiv.dataset.messageId = message.id;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = isUser ? '👤' : '🤖';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  if (message.image) {
    const img = document.createElement('img');
    img.src = message.image;
    img.className = 'message-image';
    img.alt = 'Attached image';
    img.onclick = () => window.open(message.image, '_blank');
    bubble.appendChild(img);
    bubble.appendChild(document.createElement('br'));
  }
  
  const textSpan = document.createElement('div');
  textSpan.innerHTML = renderMarkdown(message.content);
  bubble.appendChild(textSpan);
  
  contentDiv.appendChild(bubble);
  
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const time = document.createElement('span');
  time.textContent = message.timestamp || formatTimestamp();
  meta.appendChild(time);
  
  contentDiv.appendChild(meta);
  
  // Add action buttons for bot messages
  if (!isUser) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.onclick = () => copyMessage(message.content);
    
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'message-action-btn';
    ttsBtn.textContent = '🔊 Read';
    ttsBtn.onclick = () => textToSpeech(message.content);
    
    const likeBtn = document.createElement('button');
    likeBtn.className = 'message-action-btn';
    likeBtn.textContent = '👍';
    likeBtn.onclick = () => showToast('Thanks for feedback!', 'success');
    
    const dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'message-action-btn';
    dislikeBtn.textContent = '👎';
    dislikeBtn.onclick = () => showToast('Thanks for feedback!', 'info');
    
    actions.appendChild(copyBtn);
    actions.appendChild(ttsBtn);
    actions.appendChild(likeBtn);
    actions.appendChild(dislikeBtn);
    
    if (message.image) {
      const dlBtn = document.createElement('button');
      dlBtn.className = 'message-action-btn';
      dlBtn.textContent = '⬇️ Download Image';
      dlBtn.onclick = () => downloadImage(message.image, 'nova-image.png');
      actions.appendChild(dlBtn);
    }
    
    contentDiv.appendChild(actions);
  } else {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.style.justifyContent = 'flex-end';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.onclick = () => copyMessage(message.content);
    
    actions.appendChild(copyBtn);
    contentDiv.appendChild(actions);
  }
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);
  
  return messageDiv;
}

// Text to speech
export function textToSpeech(text) {
  if ('speechSynthesis' in window) {
    // Remove HTML tags for speech
    const cleanText = text.replace(/<[^>]*>/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    showToast('Reading aloud...', 'info');
  } else {
    showToast('Text-to-speech not supported', 'warning');
  }
}

// Create typing indicator
export function createTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typingIndicator';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🤖';
  
  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    bubble.appendChild(dot);
  }
  
  indicator.appendChild(avatar);
  indicator.appendChild(bubble);
  
  return indicator;
}
