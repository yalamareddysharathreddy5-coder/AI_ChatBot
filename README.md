# Jarvixss Chat

<div align="center">
  <img src="assets/logo.svg" alt="Jarvixss Chat logo" width="120" height="120">
</div>

Jarvixss Chat is a complete AI chatbot web app built with plain HTML, CSS, and vanilla JavaScript. It combines a futuristic glassmorphism interface with serverless AI endpoints for chat, voice input, read-aloud replies, maps, image search, emoji reactions, and locally saved conversations.

Created and developed by **Sharath**.

## Live Features

- **AI chat**: Groq Cloud (OpenAI-compatible) as the primary provider, with optional Google Gemini fallback and a built-in demo response when no provider is available.
- **Multiple personalities**: Friendly, Teacher, Professional, and Funny.
- **Chat sessions**: Create, rename, delete, search, and switch between conversations. Everything is saved in `localStorage`.
- **Markdown responses**: Bold, italic, code blocks with copy buttons, lists, and line breaks.
- **Rich maps**: The AI can add `[[MAP: place]]` tags. The frontend geocodes with Nominatim, renders an interactive Leaflet/OpenStreetMap card, and offers Google Maps, directions, and copy-coordinates actions.
- **Rich images**: The AI can add up to three `[[IMAGE: term]]` tags. Images come from Unsplash when configured, otherwise Wikimedia Commons, with lazy loading, credits, download, and a lightbox.
- **Image upload and vision**: Upload, drag-and-drop, or paste images. Images are compressed in the browser and sent to the Groq vision model or Gemini when supported.
- **Voice input**: Browser SpeechRecognition, with a MediaRecorder + Groq Whisper fallback when browser recognition is unavailable.
- **Voice assistant**: Full-screen voice mode with listening/thinking/speaking states, optional "Hey Jarvixss" wake phrase, mute, stop-speaking, and automatic reply playback.
- **Read-aloud replies**: Browser speech synthesis or cloud voices from Groq Orpheus. Includes speed, pitch, volume, presets, per-personality voices, pause/resume/stop controls, and automatic fallback to browser voices.
- **Emoji system**: Searchable picker, categories, skin tones, shortcode autocomplete, recent emojis, message reactions, and emoji burst animations.
- **Themes and settings**: Dark/light mode, accent color, font size, animation toggle, emoji animation toggle, and sound toggle.
- **Export**: Download the current chat as TXT or JSON, and download generated images.
- **Responsive and accessible**: Mobile sidebar, ARIA labels, keyboard shortcuts, focus handling, and reduced-motion support.

## Tech Stack

- **Frontend**: HTML5, CSS3, vanilla JavaScript ES modules, Leaflet
- **Backend**: Vercel Serverless Functions (Node.js) with a local Node dev server
- **AI**: Groq Cloud chat + vision, optional Google Gemini fallback
- **Speech**: Groq Whisper (transcription), Groq Orpheus (cloud TTS), Web Speech API (browser STT/TTS)
- **Maps**: Leaflet + OpenStreetMap, Nominatim geocoding
- **Images**: Wikimedia Commons/Wikipedia, optional Unsplash
- **Storage**: Browser `localStorage`
- **Deployment**: Vercel

## Project Structure

```text
.
├── api/
│   ├── chat.js          # Groq -> Gemini -> demo chat provider chain
│   ├── image.js         # Unsplash -> Wikimedia image search
│   ├── tts.js           # Groq Orpheus text-to-speech
│   └── transcribe.js    # Groq Whisper speech-to-text
├── assets/
│   └── logo.svg
├── css/
│   ├── style.css        # Main theme and layout
│   ├── animations.css   # Ripple, skeleton, slide, fade animations
│   ├── emoji.css        # Emoji picker, reactions, bursts
│   └── voice.css        # Voice overlay, TTS controls, voice menu
├── js/
│   ├── app.js           # App state, chat flow, maps/images, settings
│   ├── storage.js       # localStorage helpers and image compression
│   ├── ui.js            # Rendering, markdown, modals, toasts, exports
│   ├── emoji.js         # Picker, shortcodes, reactions
│   └── voice.js         # Voice assistant, STT fallback, TTS engines
├── index.html
├── server.js            # Local static file + API dev server
├── vercel.json          # Vercel function and cache configuration
├── package.json
├── .env.example
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- A [Groq API key](https://console.groq.com/keys) (recommended; the app still runs in demo mode without one)

### Local Setup

1. Clone the repository:

```bash
git clone https://github.com/yalamareddysharathreddy5-coder/AI_ChatBot.git
cd AI_ChatBot
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. Add your keys to `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_VISION_MODEL=qwen/qwen3.8-27b
GROQ_WHISPER_MODEL=whisper-large-v3

# Optional Gemini fallback
AI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-3.5-flash-lite

# Optional Unsplash image search
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

4. Start the local server:

```bash
npm run dev
```

There are no npm dependencies, so `npm install` is not required.

5. Open `http://localhost:3000`.

The local server serves both the static frontend and every `/api/*` endpoint. To use Vercel's local emulator instead, run:

```bash
npm run dev:vercel
```

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Recommended | Chat, vision, Whisper transcription, and cloud TTS |
| `GROQ_MODEL` | No | Text chat model; defaults to `openai/gpt-oss-20b` |
| `GROQ_VISION_MODEL` | No | Model used when an image is attached; defaults to `qwen/qwen3.8-27b` |
| `GROQ_WHISPER_MODEL` | No | Speech-to-text model; defaults to `whisper-large-v3` |
| `AI_API_KEY` | No | Google Gemini fallback for chat |
| `GEMINI_MODEL` | No | Preferred Gemini fallback model |
| `UNSPLASH_ACCESS_KEY` | No | Better image search results; falls back to Wikimedia |

Groq model names change over time. Check [Groq's current models](https://console.groq.com/docs/models) and update the variables if a model is retired.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/chat` | Accepts `{ messages, personality, image }` and returns `{ message, model, provider }` |
| `GET` | `/api/image?q=term` | Returns `{ results }` with up to three images and credits |
| `POST` | `/api/tts` | Accepts `{ text, voice }` (up to 200 characters) and returns WAV audio |
| `POST` | `/api/transcribe` | Accepts raw audio and returns `{ text }` |

The TTS and transcription endpoints are rate-limited to 10 requests per minute per IP. Audio uploads are limited to 10 MB.

## Deploy to Vercel

### Option 1: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Choose **Add New → Project**.
3. Import:
   `https://github.com/yalamareddysharathreddy5-coder/AI_ChatBot.git`
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: leave empty
   - **Output Directory**: leave empty
   - **Install Command**: leave empty
5. Add the environment variables from the table above under **Environment Variables**.
6. Click **Deploy**.

Because the frontend is static and the API lives in `/api`, Vercel detects the functions automatically. The included `vercel.json` only configures the function duration and disables API caching. Do not add an old `builds` array; the legacy `builds` configuration can conflict with the current `functions` setting.

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

Add the environment variables in the Vercel dashboard or with `vercel env add`.

### Important Deployment Notes

- Add `GROQ_API_KEY` in Vercel. Without it, chat falls back to demo mode and TTS/transcription return configuration errors.
- The `.env.local` file is intentionally gitignored. Never commit real API keys.
- If an older Vercel project still serves the old NovaChat build, verify that it is connected to `main` in this repository, then redeploy the latest commit. You can also remove and re-import the project.
- Voice input requires `localhost` or HTTPS. Vercel deployments are HTTPS, so this works in production.
- If a Groq model returns "model not found", update `GROQ_MODEL`, `GROQ_VISION_MODEL`, or `GROQ_WHISPER_MODEL` in Vercel and redeploy.

## Keyboard Shortcuts

- `Enter` sends a message.
- `Shift + Enter` inserts a new line.
- `Ctrl + K` creates a new chat.
- `Escape` closes modals, the emoji picker, the voice menu, or voice mode.
- `Tab` or arrow keys navigate emoji shortcode suggestions.

## Local Data

All conversations, settings, drafts, recent emojis, and reactions are stored in the browser:

- `jarvixss_sessions`
- `jarvixss_current_session`
- `jarvixss_theme`
- `jarvixss_settings`
- `jarvixss_draft`
- `jarvixss_emoji_recent`
- `jarvixss_emoji_reactions`
- `jarvixss_emoji_skin`

Older `novachat_*` keys are migrated automatically on first load. Clearing site data or using **Settings → Clear All Data** removes everything.

## Troubleshooting

### The page shows the old NovaChat version

The local branch must be pushed before Vercel can build it. Check:

```bash
git status
git log --oneline -10
git push origin main
```

Then open the Vercel project and trigger **Redeploy** for the latest commit.

### Chat works but voice does not

- Allow microphone permission in the browser.
- Use Chrome or Edge for the best SpeechRecognition support.
- Voice input only works on `localhost` or HTTPS.
- Without `GROQ_API_KEY`, the MediaRecorder fallback cannot transcribe audio.

### Cloud voice is unavailable

- Confirm `GROQ_API_KEY` is set in Vercel.
- Accept the Groq Orpheus model terms in the Groq console.
- Switch the voice engine to **Browser voices** in Settings.
- The app automatically falls back to browser speech synthesis if cloud TTS fails.

### Images do not appear

- Some topics may not return Wikimedia results.
- Adding `UNSPLASH_ACCESS_KEY` improves results.
- Image URLs are restricted to HTTP/HTTPS; blocked or malformed URLs are filtered out.

### Maps do not load

- Nominatim may rate-limit repeated lookups. Results are cached in `localStorage`.
- Check the browser console for geocoding or Leaflet errors.

### Vercel deployment fails

- Confirm the repository root contains `package.json`, `index.html`, and `api/`.
- Remove any dashboard build command or output directory overrides.
- Make sure `vercel.json` does not combine `builds` and `functions`.
- Check the Vercel build logs for the exact failing step.

## Credits

- [Groq](https://console.groq.com/) for chat, vision, Whisper, and Orpheus TTS
- [Google Gemini](https://ai.google.dev/) as an optional chat fallback
- [OpenStreetMap](https://www.openstreetmap.org/) for map tiles and data
- [Leaflet](https://leafletjs.com/) for interactive maps
- [Nominatim](https://nominatim.org/) for geocoding
- [Wikimedia Commons](https://commons.wikimedia.org/) for image search
- [Unsplash](https://unsplash.com/) for optional image search

## Creator

**Jarvixss Chat** was created and developed by **Sharath**, a final-year B.Tech Computer Science and Engineering (AI & ML) student. The app, its design, and its features were built with HTML, CSS, and JavaScript, and it is deployed on Vercel.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
