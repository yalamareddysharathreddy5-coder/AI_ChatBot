# SunGPT

A glassmorphism chat interface with a sun-themed, time-aware animated welcome
screen, live clock, projects, and locally persisted chat history. Assistant
replies are rendered as Markdown with syntax highlighting.

> This is a front-end prototype. Replies are produced by a local mock function —
> there is no backend and no external API calls.

## Features

- **Chat** — send messages with Enter or the send button; user and assistant
  bubbles are styled distinctly.
- **Mock assistant** — replies are generated locally after a short delay,
  shown with a custom animated "sun" loader.
- **Markdown replies** — headings, bold/italic, lists, blockquotes, and fenced
  code blocks with syntax highlighting (`react-markdown` + `rehype-highlight`).
- **Persistence** — conversations, projects, and chat assignments are stored in
  the browser's `localStorage` (no account, no server).
- **History** — saved chats appear in the sidebar; reopen any of them, or start
  a new chat.
- **Projects** — create named projects and assign saved chats to them.
- **Time-aware theme** — the app background and welcome scene change with your
  local time of day (morning, afternoon, evening, night).
- **Live clock** — a themed clock and date display updates in the chat panel.

## Tech stack

- [React 19](https://react.dev)
- [Vite 8](https://vite.dev)
- [react-markdown](https://github.com/remarkjs/react-markdown),
  [remark-gfm](https://github.com/remarkjs/remark-gfm),
  [rehype-highlight](https://github.com/rehypejs/rehype-highlight)
- [Oxlint](https://oxc.rs/docs/guide/usage/linter)

## Requirements

- Node.js 20 or newer
- npm (bundled with Node.js)

## Setup

```bash
git clone https://github.com/yalamareddysharathreddy5-coder/AI_ChatBot.git
cd AI_ChatBot
npm install
```

## Local development

Start the dev server with hot module replacement:

```bash
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`). Open it in your
browser. All chat data lives in `localStorage`, so clearing site data resets the
app.

## Production build

Build the static site into `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Lint the codebase:

```bash
npm run lint
```

## Deploying to Vercel

The repository is configured for a zero-config Vercel deployment. A
`vercel.json` pins the framework and output directory, but Vercel auto-detects
Vite projects anyway.

### Option A — Dashboard (recommended)

1. Push the repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and **Import** the repository.
3. Vercel detects the **Vite** framework and pre-fills:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
4. Leave the defaults and click **Deploy**. No environment variables are
   required.

Every push to `main` triggers a new production deployment.

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

## Project structure

```
.
├── index.html          # Vite entry HTML
├── vite.config.js      # Vite + React plugin config
├── vercel.json         # Vercel build/output config
├── public/             # Static assets served as-is (favicon, icons)
└── src/
    ├── main.jsx        # React root
    ├── App.jsx         # App shell, chat, history, projects, clock, sky scene
    ├── Markdown.jsx    # Markdown renderer with syntax highlighting
    ├── App.css         # Component styles and animations
    └── index.css       # Global styles and time-of-day background themes
```

## Notes

- All state is client-side and stored under the `localStorage` keys
  `sungpt-chats` and `sungpt-projects`.
- There are no backend endpoints, API keys, or environment variables to
  configure.
