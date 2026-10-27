# NovaChat

A complete, beginner-friendly AI chatbot web app built with plain HTML, CSS, and vanilla JavaScript. Features a futuristic glassmorphism + neon gradient design, multiple chat sessions, image uploads, voice input, and AI-powered conversations.

## ✨ Features

- **Chat Interface**: User and bot message bubbles with timestamps, auto-scroll, and markdown rendering
- **AI-Powered**: Answers any topic with balanced, neutral responses using Google Gemini API
- **Image Support**: Upload, drag-and-drop, or paste images (up to 5MB). AI can see images if vision is supported
- **Image & Chat Export**: Download images, export chats as TXT or JSON
- **Multiple Sessions**: Save and manage multiple chat sessions with rename, delete, and search
- **Voice Features**: Voice input (Web Speech API) and text-to-speech
- **Themes**: Dark/Light mode with CSS variables
- **Personalities**: Choose AI personality (Friendly, Teacher, Professional, Funny)
- **Local Storage**: All data saved locally, survives page refresh
- **Responsive Design**: Mobile-first, works on all devices
- **Accessibility**: ARIA labels, keyboard navigation, reduced motion support
- **Animations**: Smooth transitions, typing indicators, typewriter effects

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI**: Groq Cloud API (primary, fast) with optional Google Gemini fallback
- **Storage**: localStorage
- **APIs**: Web Speech API, Canvas API

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Groq Cloud API Key](https://console.groq.com/keys) (optional - demo mode available)

### Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/novachat.git
cd novachat
```

2. **Create environment file**
```bash
cp .env.example .env.local
```

3. **Add your API key to `.env.local`** (optional)
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```
*If no key is set, the app runs in demo mode. `AI_API_KEY` can also be set as an optional Gemini fallback.*

4. **Start the local development server**
```bash
npm run dev
```

The project has no npm dependencies, so `npm install` is not required. The dev server serves the static frontend and the `/api/chat` endpoint.

5. **Open in browser**
Navigate to `http://localhost:3000`

To use Vercel's local emulator instead, run `npm run dev:vercel` (requires the Vercel CLI).

## 🔑 Getting a Groq API Key

1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign in or create an account
3. Click "Create API Key"
4. Copy the key and add it to `.env.local` as `GROQ_API_KEY`

### Optional Gemini Fallback

If you also want a backup provider, add a Google Gemini key from [Google AI Studio](https://makersuite.google.com/app/apikey) as `AI_API_KEY`. Groq is always tried first when configured.

## 📤 Push to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: NovaChat AI chatbot"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/novachat.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🌐 Deploy on Vercel

### Option 1: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts
# For production deployment:
vercel --prod
```

### Option 2: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration
5. Add environment variable:
   - Key: `AI_API_KEY`
   - Value: Your Google Gemini API key
6. Click "Deploy"

## ⌨️ Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Ctrl + K` - New chat
- `Esc` - Close modals

## 🎨 Features Guide

### Image Upload
- Click the image icon to upload
- Drag and drop images onto the chat area
- Paste images from clipboard (Ctrl+V/Cmd+V)

### Chat Management
- Create new chats with "New Chat" button
- Rename or delete chats from the sidebar
- Search through chat history
- All chats saved automatically

### Settings
- Change AI personality
- Adjust font size
- Toggle animations
- Export or clear all data

## 🐛 Troubleshooting

### API Key Issues
- **Demo mode**: If no API key is set, the app uses demo responses
- **Rate limiting**: Free tiers have rate limits; wait a moment and try again
- **Invalid key**: Check your Groq key in `.env.local` (local) or Vercel environment variables (deployed)
- **Groq unavailable**: The app automatically tries the optional Gemini fallback, then demo mode

### Local Development Issues
- **Port already in use**: Set the `PORT` environment variable before running `npm run dev` (e.g. `PORT=3001` on macOS/Linux, `$env:PORT=3001` in PowerShell)
- **Module errors**: Ensure all files use ES module syntax
- **CORS errors**: The API function handles CORS headers

### Image Upload Issues
- **File too large**: Images are limited to 5MB
- **Compression**: Large images are auto-compressed to ~300KB

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

This is a beginner-friendly project. Feel free to fork, modify, and improve it!

## 💡 Tips for Beginners

- Start by exploring the code - it's well-commented
- Try the demo mode first to understand the UI
- Add your API key to unlock full AI capabilities
- Experiment with different settings and features

---

Made with ❤️ for learning and building amazing things!
