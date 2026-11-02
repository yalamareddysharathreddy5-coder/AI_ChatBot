// Jarvixss Chat - Voice assistant and speech playback
// Browser SpeechRecognition with MediaRecorder + /api/transcribe fallback.

import { showToast, stripRichTags } from './ui.js';

const DEFAULT_SETTINGS = {
  personality: 'friendly',
  voiceLanguage: 'auto',
  wakePhrase: false,
  voiceSpeed: 1,
  voicePitch: 1,
  voiceVolume: 1,
  autoRead: false,
  voiceEngine: 'browser',
  voiceValue: '',
  personalityVoices: {},
  voicePresets: {}
};

const CLOUD_VOICES = [
  { id: 'autumn', name: 'Autumn', gender: 'Female', lang: 'en-US', model: 'canopylabs/orpheus-v1-english' },
  { id: 'diana', name: 'Diana', gender: 'Female', lang: 'en-US', model: 'canopylabs/orpheus-v1-english' },
  { id: 'hannah', name: 'Hannah', gender: 'Female', lang: 'en-US', model: 'canopylabs/orpheus-v1-english' },
  { id: 'austin', name: 'Austin', gender: 'Male', lang: 'en-US', model: 'canopylabs/orpheus-v1-english' },
  { id: 'daniel', name: 'Daniel', gender: 'Male', lang: 'en-US', model: 'canopylabs/orpheus-v1-english' },
  { id: 'troy', name: 'Troy', gender: 'Male', lang: 'en-US', model: 'canopylabs/orpheus-v1-english' },
  { id: 'abdullah', name: 'Abdullah', gender: 'Male', lang: 'ar-SA', model: 'canopylabs/orpheus-arabic-saudi' },
  { id: 'fahad', name: 'Fahad', gender: 'Male', lang: 'ar-SA', model: 'canopylabs/orpheus-arabic-saudi' },
  { id: 'sultan', name: 'Sultan', gender: 'Male', lang: 'ar-SA', model: 'canopylabs/orpheus-arabic-saudi' },
  { id: 'lulwa', name: 'Lulwa', gender: 'Female', lang: 'ar-SA', model: 'canopylabs/orpheus-arabic-saudi' },
  { id: 'noura', name: 'Noura', gender: 'Female', lang: 'ar-SA', model: 'canopylabs/orpheus-arabic-saudi' },
  { id: 'aisha', name: 'Aisha', gender: 'Female', lang: 'ar-SA', model: 'canopylabs/orpheus-arabic-saudi' }
];

const CLOUD_MODEL_BY_VOICE = new Map(CLOUD_VOICES.map(voice => [voice.id, voice.model]));

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
let activeSpeakResolve = null;
let currentAudioResolve = null;
let ttsPaused = false;
let cachedVoices = [];
let voicePollTimer = null;
let voiceMenu = null;
let personalityVoiceStore = {};
let voicePresetStore = {};

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

function getCloudVoice(voiceId) {
  return CLOUD_VOICES.find(voice => voice.id === voiceId) || null;
}

function parseVoiceSelection(value) {
  const raw = String(value || '');
  if (raw.startsWith('cloud:')) return { engine: 'cloud', value: raw.slice(6) };
  if (raw.startsWith('browser:')) return { engine: 'browser', value: raw.slice(8) };
  return { engine: null, value: raw };
}

function getVoiceValue(settings, options = {}) {
  if (options.voiceValue !== undefined) return options.voiceValue;
  const personality = options.personality || settings.personality || 'friendly';
  const mapped = (settings.personalityVoices || {})[personality];
  if (options.usePersonality !== false && mapped) return mapped;
  return settings.voiceValue || '';
}

function resolveEngine(settings, options = {}) {
  if (options.engine) return options.engine;
  const parsed = parseVoiceSelection(getVoiceValue(settings, options));
  if (parsed.engine) return parsed.engine;
  return settings.voiceEngine === 'cloud' ? 'cloud' : 'browser';
}

function getBrowserVoice(settings, options = {}) {
  const parsed = parseVoiceSelection(getVoiceValue(settings, options));
  const wanted = parsed.engine === 'browser' ? parsed.value : (settings.voiceEngine === 'browser' ? parsed.value : '');
  if (wanted) {
    const match = cachedVoices.find(voice => (voice.voiceURI || voice.name) === wanted);
    if (match) return match;
  }
  return cachedVoices.find(voice => voice.default) || cachedVoices[0] || null;
}

function getCloudVoiceForSettings(settings, options = {}) {
  const parsed = parseVoiceSelection(getVoiceValue(settings, options));
  const wanted = parsed.engine === 'cloud' ? parsed.value : (settings.voiceEngine === 'cloud' ? parsed.value : '');
  return getCloudVoice(wanted) || getCloudVoice(settings.voiceValue) || CLOUD_VOICES[0];
}

function addOption(select, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
  return option;
}

function populateVoiceOptions(select, { allowGlobal = false, selected = '' } = {}) {
  if (!select) return;
  const settings = getSettings();
  const engine = elements.voiceEngineSelect?.value || settings.voiceEngine;
  const previous = selected || select.value;
  select.innerHTML = '';
  if (allowGlobal) addOption(select, '', 'Use global');

  if (engine === 'cloud') {
    const english = document.createElement('optgroup');
    english.label = 'Orpheus English';
    const arabic = document.createElement('optgroup');
    arabic.label = 'Orpheus Arabic (Saudi)';
    for (const voice of CLOUD_VOICES) {
      const option = document.createElement('option');
      option.value = `cloud:${voice.id}`;
      option.textContent = `${voice.name} (${voice.gender})`;
      (voice.lang === 'ar-SA' ? arabic : english).appendChild(option);
    }
    select.appendChild(english);
    select.appendChild(arabic);
  } else if (cachedVoices.length) {
    const groups = new Map();
    const sorted = [...cachedVoices].sort((a, b) => {
      if (a.default !== b.default) return a.default ? -1 : 1;
      if (a.lang !== b.lang) return String(a.lang).localeCompare(String(b.lang));
      return String(a.name).localeCompare(String(b.name));
    });
    for (const voice of sorted) {
      const lang = voice.lang || 'unknown';
      if (!groups.has(lang)) groups.set(lang, []);
      groups.get(lang).push(voice);
    }
    for (const [lang, voices] of groups) {
      const group = document.createElement('optgroup');
      group.label = lang;
      for (const voice of voices) {
        const option = document.createElement('option');
        option.value = `browser:${voice.voiceURI || voice.name}`;
        option.textContent = `${voice.name}${voice.default ? ' (default)' : ''}`;
        group.appendChild(option);
      }
      select.appendChild(group);
    }
  } else {
    addOption(select, '', 'No browser voices loaded yet');
  }

  const options = Array.from(select.options);
  if (previous && options.some(option => option.value === previous)) {
    select.value = previous;
  } else if (!allowGlobal && options.length) {
    select.value = options[0].value;
  }
}

function updateVoiceCount() {
  if (!elements.voiceCount) return;
  const settings = getSettings();
  const engine = elements.voiceEngineSelect?.value || settings.voiceEngine;
  if (engine === 'cloud') {
    elements.voiceCount.textContent = `${CLOUD_VOICES.length} cloud voices available`;
    if (elements.voiceTip) {
      elements.voiceTip.textContent = 'Cloud voices use Groq Orpheus. Add GROQ_API_KEY and accept the model terms in the Groq console. Falls back to browser voices if unavailable.';
    }
    return;
  }
  const count = cachedVoices.length;
  elements.voiceCount.textContent = count
    ? `${count} browser voice${count === 1 ? '' : 's'} available`
    : 'No browser voices loaded yet';
  if (elements.voiceTip) {
    elements.voiceTip.textContent = count
      ? 'Voices come from your browser and operating system. Pick any voice, then use Preview voice.'
      : 'Chrome sometimes loads voices after the page settles. Click Refresh voice list, or interact with the page and try again.';
  }
}

function loadVoices(force = false) {
  if (!('speechSynthesis' in window)) {
    updateVoiceCount();
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;
  const finish = voices => {
    if (voices.length) {
      cachedVoices = voices;
      refreshVoiceOptions();
    } else {
      updateVoiceCount();
    }
    return voices;
  };

  const initial = synth.getVoices();
  if (initial.length && !force) return Promise.resolve(finish(initial));

  if (voicePollTimer) {
    clearTimeout(voicePollTimer);
    voicePollTimer = null;
  }

  return new Promise(resolve => {
    let attempts = 0;
    let done = false;
    const cleanup = () => {
      done = true;
      if (voicePollTimer) {
        clearTimeout(voicePollTimer);
        voicePollTimer = null;
      }
      try { synth.removeEventListener?.('voiceschanged', onVoicesChanged); } catch {}
      try { synth.onvoiceschanged = null; } catch {}
    };
    const complete = voices => {
      if (done) return;
      cleanup();
      resolve(finish(voices));
    };
    const onVoicesChanged = () => {
      const voices = synth.getVoices();
      if (voices.length) complete(voices);
    };
    try { synth.addEventListener?.('voiceschanged', onVoicesChanged); } catch {}
    synth.onvoiceschanged = onVoicesChanged;

    const poll = () => {
      if (done) return;
      attempts++;
      const voices = synth.getVoices();
      if (voices.length) {
        complete(voices);
        return;
      }
      if (attempts >= 12) {
        complete([]);
        return;
      }
      voicePollTimer = setTimeout(poll, 250);
    };
    poll();
  });
}

function updateSliderLabels() {
  const speed = Number(elements.voiceSpeed?.value || 1);
  const pitch = Number(elements.voicePitch?.value || 1);
  const volume = Number(elements.voiceVolume?.value || 1);
  if (elements.voiceSpeedValue) elements.voiceSpeedValue.textContent = String(speed);
  if (elements.voicePitchValue) elements.voicePitchValue.textContent = String(pitch);
  if (elements.voiceVolumeValue) elements.voiceVolumeValue.textContent = String(volume);
}

function populatePresetOptions(selected = '') {
  const select = elements.voicePresetSelect;
  if (!select) return;
  select.innerHTML = '';
  addOption(select, '', 'Select a preset');
  for (const name of Object.keys(voicePresetStore).sort()) {
    addOption(select, name, name);
  }
  if (selected && voicePresetStore[selected]) select.value = selected;
}

function populatePersonalityVoiceOptions() {
  const select = elements.personalityVoiceMap;
  if (!select) return;
  const personality = elements.personalityVoiceSelect?.value || '';
  populateVoiceOptions(select, {
    allowGlobal: true,
    selected: personality ? (personalityVoiceStore[personality] || '') : ''
  });
}

function refreshVoiceOptions() {
  const voiceSelect = elements.voiceSelect;
  const selected = voiceSelect?.value || getSettings().voiceValue || '';
  populateVoiceOptions(voiceSelect, { selected });
  populatePersonalityVoiceOptions();
  updateVoiceCount();
}

export function collectVoiceSettings() {
  return {
    voiceEngine: elements.voiceEngineSelect?.value || 'browser',
    voiceValue: elements.voiceSelect?.value || '',
    voiceSpeed: Number(elements.voiceSpeed?.value || 1),
    voicePitch: Number(elements.voicePitch?.value || 1),
    voiceVolume: Number(elements.voiceVolume?.value || 1),
    autoRead: !!elements.autoReadToggle?.checked,
    wakePhrase: !!elements.wakePhraseToggle?.checked,
    voiceLanguage: elements.voiceLanguageSelect?.value || 'auto',
    personalityVoices: { ...personalityVoiceStore },
    voicePresets: { ...voicePresetStore }
  };
}

export function applyVoiceSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  personalityVoiceStore = { ...(merged.personalityVoices || {}) };
  voicePresetStore = { ...(merged.voicePresets || {}) };

  if (elements.voiceEngineSelect) elements.voiceEngineSelect.value = merged.voiceEngine || 'browser';
  if (elements.voiceLanguageSelect) elements.voiceLanguageSelect.value = merged.voiceLanguage || 'auto';
  if (elements.autoReadToggle) elements.autoReadToggle.checked = !!merged.autoRead;
  if (elements.wakePhraseToggle) elements.wakePhraseToggle.checked = !!merged.wakePhrase;
  if (elements.voiceSpeed) elements.voiceSpeed.value = String(merged.voiceSpeed ?? 1);
  if (elements.voicePitch) elements.voicePitch.value = String(merged.voicePitch ?? 1);
  if (elements.voiceVolume) elements.voiceVolume.value = String(merged.voiceVolume ?? 1);
  updateSliderLabels();

  populateVoiceOptions(elements.voiceSelect, { selected: merged.voiceValue || '' });
  populatePresetOptions();
  populatePersonalityVoiceOptions();
  updateVoiceCount();
  loadVoices();
}

function showTtsControls(text) {
  if (!elements.ttsControls) return;
  elements.ttsControls.hidden = false;
  ttsPaused = false;
  if (elements.ttsNowPlaying) {
    const snippet = plainText(text).slice(0, 80);
    elements.ttsNowPlaying.textContent = snippet ? `Reading: ${snippet}${snippet.length >= 80 ? '...' : ''}` : 'Reading aloud...';
  }
  if (elements.ttsPauseBtn) elements.ttsPauseBtn.textContent = 'Pause';
}

function hideTtsControls() {
  if (elements.ttsControls) elements.ttsControls.hidden = true;
  ttsPaused = false;
  if (elements.ttsPauseBtn) elements.ttsPauseBtn.textContent = 'Pause';
}

function pauseSpeaking() {
  if (!speaking) return;
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    ttsPaused = true;
  } else if (window.speechSynthesis?.speaking) {
    try { window.speechSynthesis.pause(); } catch {}
    ttsPaused = true;
  }
  if (elements.ttsPauseBtn) elements.ttsPauseBtn.textContent = ttsPaused ? 'Resume' : 'Pause';
}

function resumeSpeaking() {
  if (!speaking) return;
  if (currentAudio) {
    currentAudio.play().catch(() => {});
    ttsPaused = false;
  } else if (window.speechSynthesis?.paused) {
    try { window.speechSynthesis.resume(); } catch {}
    ttsPaused = false;
  }
  if (elements.ttsPauseBtn) elements.ttsPauseBtn.textContent = ttsPaused ? 'Resume' : 'Pause';
}

function togglePauseSpeaking() {
  if (ttsPaused) resumeSpeaking();
  else pauseSpeaking();
}

function finishSpeech(token) {
  if (token === currentSpeakToken) {
    speaking = false;
    hideTtsControls();
    if (active && !processing) setState('listening');
  }
  if (activeSpeakResolve) {
    const resolve = activeSpeakResolve;
    activeSpeakResolve = null;
    resolve();
  }
}

function playBrowserChunks(chunks, settings, options, token) {
  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech is not supported in this browser', 'warning');
    return Promise.resolve();
  }
  const voice = getBrowserVoice(settings, options);
  return new Promise(resolve => {
    activeSpeakResolve = resolve;
    let index = 0;
    const speakNext = () => {
      if (token !== currentSpeakToken) {
        finishSpeech(token);
        return;
      }
      if (index >= chunks.length) {
        finishSpeech(token);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.rate = Number(options.rate ?? settings.voiceSpeed) || 1;
      utterance.pitch = Number(options.pitch ?? settings.voicePitch) || 1;
      const volume = Number(options.volume ?? settings.voiceVolume);
      utterance.volume = Number.isNaN(volume) ? 1 : Math.max(0, Math.min(1, volume));
      if (voice) utterance.voice = voice;
      utterance.onend = speakNext;
      utterance.onerror = event => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
          finishSpeech(token);
          return;
        }
        showToast('Read aloud stopped: ' + (event.error || 'speech error'), 'warning');
        finishSpeech(token);
      };
      currentUtterances.push(utterance);
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  });
}

async function fetchCloudAudio(text, voiceId) {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: voiceId, model: CLOUD_MODEL_BY_VOICE.get(voiceId) })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Cloud TTS failed (${response.status})`);
  }
  return response.blob();
}

function playAudioBlob(blob, token) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    currentAudioResolve = resolve;
    currentAudioUrl = url;
    audio.volume = 1;
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      if (currentAudio === audio) currentAudio = null;
      if (currentAudioResolve === resolve) currentAudioResolve = null;
      if (currentAudioUrl === url) currentAudioUrl = null;
      URL.revokeObjectURL(url);
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Could not play the cloud audio.'));
    };
    audio.play().catch(error => {
      cleanup();
      reject(error);
    });
    if (token !== currentSpeakToken) {
      try { audio.pause(); } catch {}
      cleanup();
      resolve();
    }
  });
}

async function playCloudChunks(chunks, settings, options, token) {
  const voice = getCloudVoiceForSettings(settings, options);
  for (const chunk of chunks) {
    if (token !== currentSpeakToken) return;
    const blob = await fetchCloudAudio(chunk, voice.id);
    if (token !== currentSpeakToken) return;
    await playAudioBlob(blob, token);
  }
}

export function stopSpeaking() {
  currentSpeakToken++;
  speaking = false;
  ttsPaused = false;
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
  currentUtterances = [];
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }
  if (currentAudioResolve) {
    const resolveAudio = currentAudioResolve;
    currentAudioResolve = null;
    resolveAudio();
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  if (activeSpeakResolve) {
    const resolve = activeSpeakResolve;
    activeSpeakResolve = null;
    resolve();
  }
  hideTtsControls();
  if (active && !processing) {
    setState('listening');
  }
}

export async function speakText(text, options = {}) {
  stopSpeaking();
  const token = ++currentSpeakToken;
  const chunks = splitText(text, 180);
  if (!chunks.length) return;
  const settings = { ...DEFAULT_SETTINGS, ...(options.settings || getSettings()) };
  const engine = resolveEngine(settings, options);
  speaking = true;
  if (active) setState('speaking');
  showTtsControls(text);

  if (engine === 'cloud') {
    try {
      await playCloudChunks(chunks, settings, options, token);
      if (token === currentSpeakToken) finishSpeech(token);
      return;
    } catch (error) {
      if (token !== currentSpeakToken) return;
      showToast('Cloud voice unavailable: ' + error.message + ' Using browser voice.', 'warning');
      if (!('speechSynthesis' in window)) {
        finishSpeech(token);
        return;
      }
    }
  }

  await playBrowserChunks(chunks, settings, options, token);
}

export function speakMessage(messageId, options = {}) {
  const text = callbacks.getMessageText(messageId);
  if (!text) {
    showToast('No message text to read', 'warning');
    return Promise.resolve();
  }
  return speakText(text, options);
}

function openVoiceMenu(button, messageId) {
  closeVoiceMenu();
  const settings = getSettings();
  const menu = document.createElement('div');
  menu.className = 'voice-menu';
  menu.setAttribute('role', 'menu');

  const title = document.createElement('div');
  title.className = 'voice-menu-title';
  title.textContent = 'Read message aloud';
  menu.appendChild(title);

  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Voice for this message');
  populateVoiceOptions(select, { selected: settings.voiceValue || '' });
  menu.appendChild(select);

  const actions = document.createElement('div');
  actions.className = 'voice-menu-actions';

  const readButton = document.createElement('button');
  readButton.type = 'button';
  readButton.textContent = 'Read';
  readButton.addEventListener('click', () => {
    const parsed = parseVoiceSelection(select.value);
    speakMessage(messageId, {
      voiceValue: select.value,
      engine: parsed.engine || settings.voiceEngine,
      usePersonality: false
    });
    closeVoiceMenu();
  });

  const defaultButton = document.createElement('button');
  defaultButton.type = 'button';
  defaultButton.textContent = 'Use as default';
  defaultButton.addEventListener('click', () => {
    const parsed = parseVoiceSelection(select.value);
    callbacks.updateSettings?.({
      voiceValue: select.value,
      voiceEngine: parsed.engine || settings.voiceEngine
    });
    if (elements.voiceSelect) elements.voiceSelect.value = select.value;
    if (elements.voiceEngineSelect && parsed.engine) elements.voiceEngineSelect.value = parsed.engine;
    showToast('Default voice updated', 'success');
    closeVoiceMenu();
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', closeVoiceMenu);

  actions.append(readButton, defaultButton, closeButton);
  menu.appendChild(actions);
  document.body.appendChild(menu);
  voiceMenu = menu;

  const rect = button.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  let left = rect.right - width;
  let top = rect.bottom + 6;
  if (left < 8) left = 8;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  setTimeout(() => {
    document.addEventListener('click', handleMenuOutsideClick, true);
    document.addEventListener('keydown', handleMenuEscape, true);
  }, 0);
}

function closeVoiceMenu() {
  if (voiceMenu) {
    voiceMenu.remove();
    voiceMenu = null;
  }
  document.removeEventListener('click', handleMenuOutsideClick, true);
  document.removeEventListener('keydown', handleMenuEscape, true);
}

function handleMenuOutsideClick(event) {
  if (voiceMenu && !voiceMenu.contains(event.target)) closeVoiceMenu();
}

function handleMenuEscape(event) {
  if (event.key === 'Escape') closeVoiceMenu();
}

function previewSelectedVoice() {
  const settings = { ...getSettings(), ...collectVoiceSettings() };
  speakText('Hello! This is how I sound when I read your replies aloud.', {
    settings,
    engine: settings.voiceEngine,
    voiceValue: settings.voiceValue,
    usePersonality: false
  });
}

function resetVoiceSettings() {
  applyVoiceSettings({ ...DEFAULT_SETTINGS });
  showToast('Voice settings reset', 'info');
}

function saveVoicePreset() {
  const name = window.prompt('Preset name');
  if (!name) return;
  const values = collectVoiceSettings();
  voicePresetStore[name.trim()] = {
    voiceEngine: values.voiceEngine,
    voiceValue: values.voiceValue,
    voiceSpeed: values.voiceSpeed,
    voicePitch: values.voicePitch,
    voiceVolume: values.voiceVolume
  };
  populatePresetOptions(name.trim());
  showToast('Voice preset saved', 'success');
}

function applyVoicePreset() {
  const name = elements.voicePresetSelect?.value;
  const preset = name ? voicePresetStore[name] : null;
  if (!preset) {
    showToast('Choose a preset first', 'warning');
    return;
  }
  if (elements.voiceEngineSelect) elements.voiceEngineSelect.value = preset.voiceEngine || 'browser';
  populateVoiceOptions(elements.voiceSelect, { selected: preset.voiceValue || '' });
  if (elements.voiceSpeed) elements.voiceSpeed.value = String(preset.voiceSpeed ?? 1);
  if (elements.voicePitch) elements.voicePitch.value = String(preset.voicePitch ?? 1);
  if (elements.voiceVolume) elements.voiceVolume.value = String(preset.voiceVolume ?? 1);
  updateSliderLabels();
  updateVoiceCount();
  showToast(`Applied preset "${name}"`, 'success');
}

function deleteVoicePreset() {
  const name = elements.voicePresetSelect?.value;
  if (!name || !voicePresetStore[name]) {
    showToast('Choose a preset first', 'warning');
    return;
  }
  delete voicePresetStore[name];
  populatePresetOptions();
  showToast('Voice preset deleted', 'info');
}

function handlePersonalityChange() {
  const personality = elements.personalityVoiceSelect?.value || '';
  populateVoiceOptions(elements.personalityVoiceMap, {
    allowGlobal: true,
    selected: personality ? (personalityVoiceStore[personality] || '') : ''
  });
}

function handlePersonalityVoiceChange() {
  const personality = elements.personalityVoiceSelect?.value || '';
  if (!personality) return;
  const value = elements.personalityVoiceMap?.value || '';
  if (value) personalityVoiceStore[personality] = value;
  else delete personalityVoiceStore[personality];
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
    micIndicator: document.getElementById('voiceMicIndicator'),
    voiceSelect: document.getElementById('voiceSelect'),
    voiceEngineSelect: document.getElementById('voiceEngineSelect'),
    voiceCount: document.getElementById('voiceCount'),
    voiceTip: document.getElementById('voiceTip'),
    voiceLoadBtn: document.getElementById('voiceLoadBtn'),
    voiceSpeed: document.getElementById('voiceSpeed'),
    voicePitch: document.getElementById('voicePitch'),
    voiceVolume: document.getElementById('voiceVolume'),
    voiceSpeedValue: document.getElementById('voiceSpeedValue'),
    voicePitchValue: document.getElementById('voicePitchValue'),
    voiceVolumeValue: document.getElementById('voiceVolumeValue'),
    autoReadToggle: document.getElementById('autoReadToggle'),
    wakePhraseToggle: document.getElementById('wakePhraseToggle'),
    voiceLanguageSelect: document.getElementById('voiceLanguageSelect'),
    voicePreviewBtn: document.getElementById('voicePreviewBtn'),
    voiceResetBtn: document.getElementById('voiceResetBtn'),
    voicePresetSelect: document.getElementById('voicePresetSelect'),
    voicePresetSaveBtn: document.getElementById('voicePresetSaveBtn'),
    voicePresetApplyBtn: document.getElementById('voicePresetApplyBtn'),
    voicePresetDeleteBtn: document.getElementById('voicePresetDeleteBtn'),
    personalityVoiceSelect: document.getElementById('personalityVoiceSelect'),
    personalityVoiceMap: document.getElementById('personalityVoiceMap'),
    ttsControls: document.getElementById('ttsControls'),
    ttsNowPlaying: document.getElementById('ttsNowPlaying'),
    ttsPauseBtn: document.getElementById('ttsPauseBtn'),
    ttsStopBtn: document.getElementById('ttsStopBtn')
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

  elements.voiceEngineSelect?.addEventListener('change', () => {
    refreshVoiceOptions();
  });
  elements.voiceLoadBtn?.addEventListener('click', () => {
    loadVoices(true).then(() => showToast('Voice list refreshed', 'info'));
  });
  elements.voiceSpeed?.addEventListener('input', updateSliderLabels);
  elements.voicePitch?.addEventListener('input', updateSliderLabels);
  elements.voiceVolume?.addEventListener('input', updateSliderLabels);
  elements.voicePreviewBtn?.addEventListener('click', previewSelectedVoice);
  elements.voiceResetBtn?.addEventListener('click', resetVoiceSettings);
  elements.voicePresetSaveBtn?.addEventListener('click', saveVoicePreset);
  elements.voicePresetApplyBtn?.addEventListener('click', applyVoicePreset);
  elements.voicePresetDeleteBtn?.addEventListener('click', deleteVoicePreset);
  elements.personalityVoiceSelect?.addEventListener('change', handlePersonalityChange);
  elements.personalityVoiceMap?.addEventListener('change', handlePersonalityVoiceChange);
  elements.ttsPauseBtn?.addEventListener('click', togglePauseSpeaking);
  elements.ttsStopBtn?.addEventListener('click', stopSpeaking);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) closeVoiceAssistant();
  });

  document.addEventListener('click', event => {
    const menuBtn = event.target.closest('.voice-menu-btn');
    if (menuBtn) {
      event.preventDefault();
      event.stopPropagation();
      openVoiceMenu(menuBtn, menuBtn.dataset.messageId);
      return;
    }
    const readBtn = event.target.closest('.read-aloud-btn');
    if (readBtn) {
      event.preventDefault();
      speakMessage(readBtn.dataset.messageId);
    }
  });

  applyVoiceSettings(callbacks.getSettings());

  window.addEventListener('beforeunload', () => {
    stopRecognition();
    stopFallbackRecording();
    stopSpeaking();
    releaseMicrophone();
  });
}
