// Jarvixss Chat - Voice assistant and speech playback
// Browser SpeechRecognition with MediaRecorder + /api/transcribe fallback.

import { showToast, stripRichTags } from './ui.js';

const DEFAULT_SETTINGS = {
  voiceLanguage: 'auto',
  wakePhrase: false,
  voiceSpeed: 1,
  voicePitch: 1,
  voiceVolume: 1,
  autoRead: false,
  voiceEngine: 'browser',
  voiceValue: ''
};

let callbacks = {
  getSettings: () => ({}),
  sendMessage: async () => '',
  getMessageText: () => ''
};

let active = false;
let processing = false;
let muted = false;
let forceFallback = false;
let recognition = null;
let recognitionActive = false;
let restartTimer = null;
let consecutiveErrors = 0;
let lastError = 'none';
let mediaStream = null;
let mediaRecorder = null;
let recordingChunks = [];
let recordingTimer = null;
let silenceTimer = null;
let audioContext = null;
let analyser = null;
let analyserSource = null;
let analyserFrame = null;
let speechDetected = false;
let currentSpeakToken = 0;
let currentUtterances = [];
let currentAudio = null;
let currentAudioUrl = null;
let speaking = false;

let elements = {};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(callbacks.getSettings() || {}) };
}

function plainText(text) {
  return stripRichTags(String(text || ''))
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setState(state, error) {
  if (error) lastError = error;
  if (elements.overlay) elements.overlay.dataset.voiceState = state;
  if (elements.orb) {
    elements.orb.classList.remove('idle', 'listening', 'thinking', 'speaking');
    if (state === 'idle') elements.orb.classList.add('idle');
    if (state === 'listening' || state === 'requesting') elements.orb.classList.add('listening');
    if (state === 'thinking') elements.orb.classList.add('thinking');
    if (state === 'speaking') elements.orb.classList.add('speaking');
  }
  const labels = {
    idle: 'Voice Assistant Ready',
    requesting: 'Requesting microphone...',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
    paused: 'Microphone muted',
    error: 'Voice error'
  };
  if (elements.status) elements.status.textContent = labels[state] || state;
  if (elements.debug) {
    elements.debug.textContent = `State: ${state} | Last error: ${lastError || 'none'}`;
  }
  if (elements.ariaLive) elements.ariaLive.textContent = labels[state] || state;
}

function setCaption(text) {
  if (elements.captions) elements.captions.textContent = text;
}

function getRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function isInsecureContext() {
  const host = window.location.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return !window.isSecureContext && !local;
}

function getLanguage() {
  const settings = getSettings();
  if (settings.voiceLanguage && settings.voiceLanguage !== 'auto') {
    return settings.voiceLanguage;
  }
  return navigator.language || 'en-US';
}

function clearRestart() {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
}

function scheduleRestart(delay = 600) {
  clearRestart();
  if (!active || processing || muted) return;
  if (consecutiveErrors >= 3) {
    setCaption('Voice paused after repeated errors. Tap the orb to try again.');
    setState('error', lastError);
    return;
  }
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startListening();
  }, delay);
}

function stopRecognition() {
  if (recognition) {
    try {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.abort();
    } catch {}
    recognition = null;
  }
  recognitionActive = false;
}

async function ensureMicrophone() {
  if (isInsecureContext()) {
    throw new Error('Microphone needs a secure context. Open the app on localhost or HTTPS.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not expose microphone access.');
  }
  if (mediaStream && mediaStream.active) return mediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return mediaStream;
  } catch (error) {
    const name = error?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new Error('Microphone permission denied. Allow mic access in your browser settings and try again.');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new Error('No microphone was found. Connect a microphone and try again.');
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      throw new Error('The microphone is busy or unavailable. Close other apps using it and try again.');
    }
    throw new Error('Could not start the microphone: ' + (error?.message || 'unknown error'));
  }
}

function releaseMicrophone() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

function startListening() {
  clearRestart();
  if (!active || processing || muted) return;
  if (isInsecureContext()) {
    const message = 'Microphone needs localhost or HTTPS. Open the app on localhost or HTTPS and try again.';
    setState('error', message);
    setCaption(message);
    return;
  }

  setState('requesting');
  setCaption('Requesting microphone permission...');

  ensureMicrophone()
    .then(() => {
      if (!active || processing || muted) return;
      const SpeechRecognition = getRecognitionConstructor();
      if (SpeechRecognition && !forceFallback) {
        startSpeechRecognition(SpeechRecognition);
      } else if (window.MediaRecorder) {
        startFallbackRecording();
      } else {
        const message = 'Speech recognition is not supported in this browser. Try Chrome, Edge, or use the MediaRecorder fallback in a supported browser.';
        setState('error', message);
        setCaption(message);
      }
    })
    .catch(error => {
      setState('error', error.message);
      setCaption(error.message);
    });
}

function startSpeechRecognition(SpeechRecognition) {
  stopRecognition();
  const rec = new SpeechRecognition();
  recognition = rec;
  rec.lang = getLanguage();
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    recognitionActive = true;
    setState('listening');
    setCaption('Listening... speak now.');
  };

  rec.onresult = event => {
    let interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (interim) setCaption('Hearing: ' + interim.trim());
    if (finalText.trim()) {
      handleTranscript(finalText.trim());
    }
  };

  rec.onerror = event => {
    handleRecognitionError(event.error || 'unknown');
  };

  rec.onend = () => {
    recognitionActive = false;
    recognition = null;
    if (!active || processing || muted) return;
    scheduleRestart(500);
  };

  try {
    rec.start();
  } catch (error) {
    recognition = null;
    handleRecognitionError(error?.message || 'start-failed');
  }
}

function handleRecognitionError(errorCode) {
  if (errorCode === 'aborted') return;
  consecutiveErrors++;
  let message = 'Voice recognition error: ' + errorCode;
  if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
    message = 'Microphone permission denied. Allow mic access in your browser settings and try again.';
  } else if (errorCode === 'no-speech') {
    message = "I didn't hear anything. Try speaking a little closer to the microphone.";
  } else if (errorCode === 'audio-capture') {
    message = 'No microphone was found. Connect a microphone and try again.';
  } else if (errorCode === 'network') {
    message = 'Chrome speech recognition needs an internet connection. Check your connection, or try the MediaRecorder fallback.';
    forceFallback = true;
  } else if (errorCode === 'language-not-supported') {
    message = 'The selected speech language is not supported by this browser. Choose another language in Settings.';
  }
  setState('error', message);
  setCaption(message);
  if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed' || errorCode === 'audio-capture') {
    return;
  }
  scheduleRestart(errorCode === 'network' ? 1200 : 1400);
}

async function handleTranscript(text) {
  if (!active || processing) return;
  const settings = getSettings();
  if (settings.wakePhrase && !/\bhey\s+jarvixss\b/i.test(text)) {
    setCaption(`Wake phrase mode: say "Hey Jarvixss" followed by your message.`);
    setState('listening');
    scheduleRestart(300);
    return;
  }

  processing = true;
  consecutiveErrors = 0;
  clearRestart();
  stopRecognition();
  stopFallbackRecording();
  setState('thinking');
  setCaption('You: ' + text);

  try {
    const reply = await callbacks.sendMessage(text);
    if (!active) return;
    if (reply) {
      setCaption('Jarvixss: ' + plainText(reply));
      setState('speaking');
      await speakText(reply, { source: 'assistant' });
    }
  } catch (error) {
    const message = 'Could not get a reply: ' + (error?.message || 'unknown error');
    setState('error', message);
    setCaption(message);
  } finally {
    processing = false;
    if (active && !muted) scheduleRestart(400);
  }
}

function stopFallbackRecording() {
  if (recordingTimer) {
    clearTimeout(recordingTimer);
    recordingTimer = null;
  }
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (analyserFrame) {
    cancelAnimationFrame(analyserFrame);
    analyserFrame = null;
  }
  if (analyserSource) {
    try { analyserSource.disconnect(); } catch {}
    analyserSource = null;
  }
  if (audioContext) {
    try { audioContext.close(); } catch {}
    audioContext = null;
  }
  analyser = null;
  speechDetected = false;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch {}
  }
}

function startFallbackRecording() {
  if (!window.MediaRecorder) {
    const message = 'MediaRecorder is not available in this browser.';
    setState('error', message);
    setCaption(message);
    return;
  }
  stopRecognition();
  stopFallbackRecording();
  recordingChunks = [];
  setState('listening');
  setCaption('Listening with MediaRecorder fallback... speak now.');

  try {
    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : {};
    mediaRecorder = new MediaRecorder(mediaStream, options);
  } catch (error) {
    setState('error', 'Could not start audio recording: ' + error.message);
    setCaption('Could not start audio recording: ' + error.message);
    return;
  }

  mediaRecorder.ondataavailable = event => {
    if (event.data && event.data.size > 0) recordingChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordingChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
    mediaRecorder = null;
    if (!active || processing) return;
    if (blob.size < 1000) {
      consecutiveErrors++;
      const message = "I didn't hear anything. Try speaking a little closer to the microphone.";
      setState('error', message);
      setCaption(message);
      scheduleRestart(1000);
      return;
    }
    processing = true;
    setState('thinking');
    setCaption('Transcribing audio...');
    try {
      const text = await transcribeBlob(blob);
      processing = false;
      if (text) handleTranscript(text);
      else {
        consecutiveErrors++;
        setState('error', 'No speech was detected in the recording.');
        setCaption('No speech was detected in the recording. Try again.');
        scheduleRestart(1000);
      }
    } catch (error) {
      processing = false;
      consecutiveErrors++;
      setState('error', error.message);
      setCaption(error.message);
      scheduleRestart(1600);
    }
  };

  try {
    mediaRecorder.start();
  } catch (error) {
    setState('error', 'Could not start audio recording: ' + error.message);
    setCaption('Could not start audio recording: ' + error.message);
    return;
  }

  setupSilenceDetection();
  recordingTimer = setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  }, 10000);
}

function setupSilenceDetection() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyserSource = audioContext.createMediaStreamSource(mediaStream);
    analyserSource.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const check = () => {
      if (!analyser || !mediaRecorder || mediaRecorder.state !== 'recording') return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > 0.025) {
        speechDetected = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      } else if (speechDetected && !silenceTimer) {
        silenceTimer = setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        }, 1200);
      }
      analyserFrame = requestAnimationFrame(check);
    };
    analyserFrame = requestAnimationFrame(check);
  } catch {}
}

async function transcribeBlob(blob) {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'audio/webm' },
    body: blob
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Transcription failed (${response.status})`);
  }
  if (!data.text) throw new Error('No speech was detected in the recording.');
  return data.text;
}

function splitText(text, maxLength) {
  const clean = plainText(text);
  if (clean.length <= maxLength) return clean ? [clean] : [];
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      const words = trimmed.split(/\s+/);
      let part = '';
      for (const word of words) {
        if ((part + ' ' + word).trim().length > maxLength) {
          if (part) chunks.push(part.trim());
          part = word;
        } else {
          part = (part + ' ' + word).trim();
        }
      }
      if (part) chunks.push(part.trim());
      continue;
    }
    if ((current + ' ' + trimmed).trim().length > maxLength) {
      if (current) chunks.push(current.trim());
      current = trimmed;
    } else {
      current = (current + ' ' + trimmed).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

export function stopSpeaking() {
  currentSpeakToken++;
  speaking = false;
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
  currentUtterances = [];
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  if (active && !processing) {
    setState('listening');
  }
}

export function speakText(text, options = {}) {
  stopSpeaking();
  const token = ++currentSpeakToken;
  const chunks = splitText(text, 180);
  if (!chunks.length) return Promise.resolve();
  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech is not supported in this browser', 'warning');
    return Promise.resolve();
  }

  const settings = getSettings();
  speaking = true;
  if (active) setState('speaking');

  return new Promise(resolve => {
    let index = 0;
    const speakNext = () => {
      if (token !== currentSpeakToken || index >= chunks.length) {
        if (token === currentSpeakToken) speaking = false;
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.rate = Number(options.rate ?? settings.voiceSpeed) || 1;
      utterance.pitch = Number(options.pitch ?? settings.voicePitch) || 1;
      utterance.volume = Number(options.volume ?? settings.voiceVolume);
      if (Number.isNaN(utterance.volume)) utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        utterance.voice = voices.find(voice => voice.default) || voices[0];
      }
      utterance.onend = speakNext;
      utterance.onerror = event => {
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        showToast('Read aloud stopped: ' + (event.error || 'speech error'), 'warning');
        speaking = false;
        resolve();
      };
      currentUtterances.push(utterance);
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  });
}

export function speakMessage(messageId, options = {}) {
  const text = callbacks.getMessageText(messageId);
  if (!text) {
    showToast('No message text to read', 'warning');
    return Promise.resolve();
  }
  return speakText(text, options);
}

function openVoiceAssistant() {
  active = true;
  muted = false;
  processing = false;
  forceFallback = false;
  consecutiveErrors = 0;
  lastError = 'none';
  if (elements.overlay) elements.overlay.classList.add('active');
  if (elements.button) elements.button.classList.add('active');
  if (elements.micIndicator) elements.micIndicator.classList.add('active');
  if (elements.micBtn) elements.micBtn.textContent = '🎤 Mute';
  setCaption('Tap the orb to speak, or wait for listening to start...');
  setState('idle');
  startListening();
}

function closeVoiceAssistant() {
  active = false;
  processing = false;
  clearRestart();
  stopRecognition();
  stopFallbackRecording();
  stopSpeaking();
  releaseMicrophone();
  if (elements.overlay) elements.overlay.classList.remove('active');
  if (elements.button) elements.button.classList.remove('active');
  if (elements.micIndicator) elements.micIndicator.classList.remove('active');
  setState('idle');
  setCaption('Tap the orb to start...');
}

function toggleMute() {
  muted = !muted;
  if (muted) {
    clearRestart();
    stopRecognition();
    stopFallbackRecording();
    setState('paused');
    setCaption('Microphone muted. Click Unmute to continue.');
    if (elements.micBtn) elements.micBtn.textContent = '🔇 Unmute';
  } else {
    if (elements.micBtn) elements.micBtn.textContent = '🎤 Mute';
    consecutiveErrors = 0;
    startListening();
  }
}

function handleOrbClick() {
  if (!active) {
    openVoiceAssistant();
    return;
  }
  if (speaking) {
    stopSpeaking();
  }
  if (muted) {
    toggleMute();
    return;
  }
  if (recognition || mediaRecorder) {
    stopRecognition();
    stopFallbackRecording();
    consecutiveErrors = 0;
  }
  processing = false;
  startListening();
}

export function initVoiceAssistant(initCallbacks = {}) {
  callbacks = { ...callbacks, ...initCallbacks };
  elements = {
    button: document.getElementById('voiceAssistantBtn'),
    overlay: document.getElementById('voiceOverlay'),
    orb: document.getElementById('voiceOrb'),
    status: document.getElementById('voiceStatus'),
    captions: document.getElementById('voiceCaptions'),
    debug: document.getElementById('voiceDebug'),
    micBtn: document.getElementById('voiceMuteBtn'),
    stopSpeakBtn: document.getElementById('voiceStopSpeakBtn'),
    endBtn: document.getElementById('voiceEndBtn'),
    ariaLive: document.getElementById('voiceAriaLive'),
    micIndicator: document.getElementById('voiceMicIndicator')
  };

  if (!elements.button || !elements.overlay) return;

  elements.button.addEventListener('click', event => {
    event.preventDefault();
    openVoiceAssistant();
  });
  elements.endBtn?.addEventListener('click', closeVoiceAssistant);
  elements.orb?.addEventListener('click', handleOrbClick);
  elements.orb?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOrbClick();
    }
  });
  elements.micBtn?.addEventListener('click', toggleMute);
  elements.stopSpeakBtn?.addEventListener('click', () => {
    stopSpeaking();
    if (active && !processing) scheduleRestart(300);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) closeVoiceAssistant();
  });

  document.addEventListener('click', event => {
    const readBtn = event.target.closest('.read-aloud-btn');
    if (readBtn) {
      event.preventDefault();
      speakMessage(readBtn.dataset.messageId);
    }
  });

  window.addEventListener('beforeunload', () => {
    stopRecognition();
    stopFallbackRecording();
    stopSpeaking();
    releaseMicrophone();
  });
}
