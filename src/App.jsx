import { Fragment, useEffect, useRef, useState } from 'react'
import './App.css'
import Markdown from './Markdown.jsx'
import { decorateReply } from './emoji.js'
import { getMockReply } from './mock.js'
import { buildImageUrl, extractImageSubject, isImageQuery } from '../lib/image.js'

const CHATS_KEY = 'sun-chat-bot-chats'
const PROJECTS_KEY = 'sun-chat-bot-projects'
const LOCATION_KEY = 'sun-chat-bot-location'
const LOCATION_DENIED_KEY = 'sun-chat-bot-location-denied'
const RAY_COUNT = 8

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now - date) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function loadFromStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

function getTimeOfDay(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 20) return 'evening'
  return 'night'
}

const WEATHER_QUERY_RE =
  /\b(weather|forecast|temperature|humidity|windy|wind speed|raining|rain(?:fall|y|ing)?|sunny|sunshine|snow(?:fall|ing)?|thunder(?:storm)?|drizzle|overcast|fog(?:gy)?|hail|humid|outside|precipitation|degrees|celsius|fahrenheit|how (?:hot|cold) is it|is it (?:hot|cold|warm|sunny|rainy|raining)|today'?s weather)\b/i

function isWeatherQuery(text) {
  return WEATHER_QUERY_RE.test(String(text || ''))
}

const LOCATION_QUERY_RE =
  /\b(where am i|where do i (?:live|stay|belong)|what (?:city|town|village|state|region|country|neighborhood|neighbourhood) (?:am i|is this|do i (?:live|stay|belong))|what is my (?:current |exact )?location|my location|nearby|near me|close to me|around me|closest|nearest|how far|how far away|directions|where is|which (?:city|town|village|state|region|country|neighborhood|neighbourhood)|geolocation|gps coordinates|local)\b/i

function isLocationQuery(text) {
  return LOCATION_QUERY_RE.test(String(text || ''))
}

function getCoordinates(options = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 10 * 60 * 1000, ...options }
    )
  })
}

function loadStoredLocation() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCATION_KEY))
    return stored && typeof stored === 'object' ? stored : null
  } catch {
    return null
  }
}

function saveStoredLocation(location) {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
  } catch {
    // storage unavailable or full; location just won't persist across reloads
  }
}

function hasLocationDeniedFlag() {
  return localStorage.getItem(LOCATION_DENIED_KEY) === '1'
}

function persistLocationDeniedFlag(value) {
  if (value) localStorage.setItem(LOCATION_DENIED_KEY, '1')
  else localStorage.removeItem(LOCATION_DENIED_KEY)
}

async function resolveLocationName(latitude, longitude) {
  try {
    const response = await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data?.label || null
  } catch {
    return null
  }
}

function SunLoader() {
  return (
    <div className="sun-loader" role="status" aria-label="Sun Chat Bot is thinking">
      <div className="sun-halo" />
      <div className="sun-core" />
      <div className="sun-rays">
        {Array.from({ length: RAY_COUNT }, (_, i) => (
          <span
            key={i}
            className="ray"
            style={{ '--i': i, '--angle': `${i * (360 / RAY_COUNT)}deg` }}
          />
        ))}
      </div>
    </div>
  )
}

const THEME_COPY = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
}

const rand = (seed) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function SkyScene({ theme }) {
  const stars = Array.from({ length: 48 }, (_, i) => {
    const size = rand(i * 11.9)
    return {
      left: `${(rand(i * 7.31) * 100).toFixed(1)}%`,
      top: `${(rand(i * 3.97) * 46 + 2).toFixed(1)}%`,
      size: size < 0.18 ? 4.5 : size < 0.5 ? 3.2 : 2.3,
      delay: `${(rand(i * 13.1) * 3.4).toFixed(2)}s`,
      dur: `${(1.8 + rand(i * 17.3) * 3.2).toFixed(2)}s`,
      min: 0.12,
      max: rand(i * 19.7) < 0.25 ? 0.85 : 1,
    }
  })

  return (
    <div className={`welcome-sky ${theme}`}>
      <div className="sky-gradient" />
      <div className="horizon" />
      {theme === 'night' ? (
        <>
          <div className="stars">
            {stars.map((s, i) => (
              <span
                key={i}
                className="star"
                style={{
                  left: s.left,
                  top: s.top,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  '--twinkle-dur': s.dur,
                  '--twinkle-min': s.min,
                  '--twinkle-max': s.max,
                  animationDelay: s.delay,
                }}
              />
            ))}
          </div>
          <div className="planet planet-saturn" />
          <div className="planet planet-mars" />
          <div className="planet planet-blue" />
          <div className="planet planet-pale" />
          <div className="moon" />
          <div className="shooting-star shooting-star-one" />
          <div className="shooting-star shooting-star-two" />
        </>
      ) : (
        <div className="sky-sun">
          <div className="sun-rays" />
          <div className="sun" />
        </div>
      )}
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="cloud cloud-three" />
      <div className="welcome-copy">
        <span className="welcome-logo">{theme === 'night' ? '\u263E' : '\u2600'}</span>
        <p className="welcome-title">Start a conversation with Sun Chat Bot</p>
        <p className="welcome-sub">{THEME_COPY[theme]}</p>
      </div>
    </div>
  )
}

const CLOCK_EMOJI = {
  morning: '☀️',
  afternoon: '🌞',
  evening: '🌇',
  night: '🌙',
}

function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function Clock({ theme }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hours24 = now.getHours()
  const hours = hours24 % 12 || 12
  const minutes = now.getMinutes()
  const ampm = hours24 >= 12 ? 'PM' : 'AM'
  const pad = (n) => String(n).padStart(2, '0')
  const groups = [pad(hours), pad(minutes)]
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const periodEmoji = CLOCK_EMOJI[getTimeOfDay(now)]
  const dayEmoji = isWeekend(now) ? '🎉' : '📅'

  return (
    <div className={`clock clock-${theme}`}>
      <div className="clock-time">
        {groups.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <span className="clock-sep">:</span>}
            {[...group].map((digit, di) => (
              <span key={`${di}-${digit}`} className="clock-digit">
                {digit}
              </span>
            ))}
          </Fragment>
        ))}
        <span className="clock-ampm">{ampm}</span>
        <span key={periodEmoji} className="clock-emoji">
          {periodEmoji}
        </span>
      </div>
      <div key={`${dateStr}-${dayEmoji}`} className="clock-date">
        <span key={dayEmoji} className="clock-date-emoji">
          {dayEmoji}
        </span>
        {dateStr}
      </div>
    </div>
  )
}

function ImageMessage({ message }) {
  const [status, setStatus] = useState('loading')
  const { imageUrl, prompt } = message

  return (
    <div className="bubble image-bubble">
      <div className="image-frame">
        {status !== 'error' && (
          <img
            className={`generated-image${status === 'loaded' ? ' loaded' : ''}`}
            src={imageUrl}
            alt={prompt || 'Generated image'}
            referrerPolicy="no-referrer"
            onLoad={() => {
              console.log('[Sun Chat Bot] image loaded:', imageUrl)
              setStatus('loaded')
            }}
            onError={() => {
              console.error('[Sun Chat Bot] image failed to load:', imageUrl)
              setStatus('error')
            }}
          />
        )}
        {status === 'loading' && <div className="image-skeleton" aria-hidden="true" />}
        {status === 'error' && (
          <div className="image-fallback">
            <p>The image could not be loaded right now.</p>
            <a href={imageUrl} target="_blank" rel="noopener noreferrer">
              Open it in a new tab
            </a>
          </div>
        )}
      </div>
      {prompt ? <p className="image-caption">{prompt}</p> : null}
    </div>
  )
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState('chats')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [chats, setChats] = useState(() => loadFromStorage(CHATS_KEY))
  const [projects, setProjects] = useState(() => loadFromStorage(PROJECTS_KEY))
  const [newProjectName, setNewProjectName] = useState('')
  const [assignMenuFor, setAssignMenuFor] = useState(null)
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [timeOfDay] = useState(() => getTimeOfDay())
  const [location, setLocation] = useState(() => loadStoredLocation())
  const [locationDenied, setLocationDenied] = useState(() => hasLocationDeniedFlag())
  const [showLocationBanner, setShowLocationBanner] = useState(() => {
    const stored = loadStoredLocation()
    return !(stored?.latitude != null && stored?.longitude != null) && !hasLocationDeniedFlag()
  })
  const idRef = useRef(0)
  const messagesRef = useRef([])
  const messagesEndRef = useRef(null)
  const requestRef = useRef(0)
  const locationRef = useRef(
    loadStoredLocation() || { latitude: null, longitude: null, place: null }
  )
  const locationInitRef = useRef(false)
  const locationPendingRef = useRef(false)

  const setLocationState = (loc) => {
    locationRef.current = loc
    setLocation(loc)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(() => {
    document.body.dataset.theme = timeOfDay
  }, [timeOfDay])

  const requestLocation = async (refresh = false) => {
    if (locationPendingRef.current) return null
    locationPendingRef.current = true
    try {
      const coords = await getCoordinates(refresh ? { maximumAge: 0 } : {})
      if (!coords) {
        persistLocationDeniedFlag(true)
        setLocationDenied(true)
        return null
      }
      persistLocationDeniedFlag(false)
      setLocationDenied(false)
      const place = await resolveLocationName(coords.latitude, coords.longitude)
      const loc = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        place,
      }
      setLocationState(loc)
      saveStoredLocation(loc)
      return loc
    } finally {
      locationPendingRef.current = false
    }
  }

  useEffect(() => {
    if (locationInitRef.current) return
    locationInitRef.current = true
    const stored = locationRef.current
    if (stored?.latitude != null && stored?.longitude != null) return
    if (hasLocationDeniedFlag()) return
    requestLocation()
  }, [])

  const updateMessages = (msgs) => {
    messagesRef.current = msgs
    setMessages(msgs)
  }

  const invalidatePendingRequest = () => {
    requestRef.current += 1
    setIsThinking(false)
  }

  const persistChat = (msgs, chatId, projectId = null) => {
    if (msgs.length === 0) return chatId

    const firstUserMsg = msgs.find((m) => m.role === 'user')?.content || 'New Chat'
    let id = chatId
    if (!id) id = crypto.randomUUID()

    setChats((prev) => {
      const existing = prev.find((c) => c.id === id)
      const updated = existing
        ? prev.map((c) => (c.id === id ? { ...c, title: firstUserMsg, messages: msgs } : c))
        : [...prev, { id, title: firstUserMsg, timestamp: Date.now(), messages: msgs, projectId }]
      localStorage.setItem(CHATS_KEY, JSON.stringify(updated))
      return updated
    })

    return id
  }

  const persistProjects = (updated) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return

    // Detect image intent FIRST — before any Groq call. Image requests never
    // reach the text API: the image URL is built right here (Pollinations needs
    // no key), so it works even without a backend.
    const wantsImage = isImageQuery(text)

    const requestId = ++requestRef.current

    const userMsg = { id: ++idRef.current, role: 'user', content: text }
    const newMessages = [...messagesRef.current, userMsg]

    updateMessages(newMessages)
    setInput('')

    const chatId = persistChat(newMessages, activeChatId)
    if (chatId !== activeChatId) setActiveChatId(chatId)

    setIsThinking(true)
    try {
      if (wantsImage) {
        console.log(
          '[Sun Chat Bot] IMAGE INTENT DETECTED → skipping Groq text API:',
          text,
        )
        const subject = extractImageSubject(text)
        const imageUrl = buildImageUrl(subject)
        console.log('[Sun Chat Bot] image subject:', subject)
        console.log('[Sun Chat Bot] image URL built:', imageUrl)
        const assistantMsg = {
          id: ++idRef.current,
          role: 'assistant',
          contentType: 'image',
          imageUrl,
          prompt: subject,
          content: `Generated image: ${subject}`,
        }
        const updated = [...messagesRef.current, assistantMsg]
        updateMessages(updated)
        persistChat(updated, chatId)
        return
      }

      console.log('[Sun Chat Bot] TEXT INTENT → sending to Groq:', text)

      const conversation = newMessages.map(({ role, content }) => ({
        role,
        content,
      }))

      const wantsWeather = isWeatherQuery(text)
      const wantsLocation = isLocationQuery(text)

      const stored = locationRef.current
      let coords =
        stored?.latitude != null && stored?.longitude != null
          ? { latitude: stored.latitude, longitude: stored.longitude }
          : null
      let place = stored?.place || null

      if ((wantsWeather || wantsLocation) && !coords) {
        const resolved = await requestLocation()
        if (resolved) {
          coords = { latitude: resolved.latitude, longitude: resolved.longitude }
          place = resolved.place || null
        } else if (
          locationRef.current?.latitude != null &&
          locationRef.current?.longitude != null
        ) {
          coords = {
            latitude: locationRef.current.latitude,
            longitude: locationRef.current.longitude,
          }
          place = locationRef.current.place || null
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation,
          clientTime: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          wantsWeather,
          wantsLocation,
          wantsImage,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          locationName: place,
        }),
      })

      const data = await response.json().catch(() => null)
      if (requestRef.current !== requestId) return

      if (response.ok && data?.location) {
        const loc = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          place: data.location.label,
        }
        setLocationState(loc)
        saveStoredLocation(loc)
      }

      const isImage = response.ok && data?.type === 'image'

      const content = response.ok
        ? isImage
          ? data?.prompt
            ? `Generated image: ${data.prompt}`
            : 'Generated image.'
          : decorateReply(data?.content || 'No response returned.')
        : `> ⚠️ **Sun Chat Bot could not get a reply.**\n\n${data?.error || `The request failed with status ${response.status}.`}`

      const assistantMsg = { id: ++idRef.current, role: 'assistant', content }
      if (isImage) {
        assistantMsg.contentType = 'image'
        assistantMsg.imageUrl = data.imageUrl
        assistantMsg.prompt = data.prompt
      }
      const updated = [...messagesRef.current, assistantMsg]
      updateMessages(updated)
      persistChat(updated, chatId)
    } catch {
      if (requestRef.current !== requestId) return
      const assistantMsg = wantsImage
        ? {
            id: ++idRef.current,
            role: 'assistant',
            contentType: 'image',
            imageUrl: buildImageUrl(text),
            prompt: text,
            content: `Generated image: ${text}`,
          }
        : {
            id: ++idRef.current,
            role: 'assistant',
            content: decorateReply(getMockReply(text)),
          }
      const updated = [...messagesRef.current, assistantMsg]
      updateMessages(updated)
      persistChat(updated, chatId)
    } finally {
      if (requestRef.current === requestId) setIsThinking(false)
    }
  }

  const handleNewChat = () => {
    invalidatePendingRequest()
    if (messagesRef.current.length > 0) persistChat(messagesRef.current, activeChatId)
    updateMessages([])
    setInput('')
    setActiveChatId(null)
    idRef.current = 0
    setSidebarOpen(false)
  }

  const handleNewProjectChat = (projectId) => {
    invalidatePendingRequest()
    if (messagesRef.current.length > 0) persistChat(messagesRef.current, activeChatId)

    const id = crypto.randomUUID()
    setChats((prev) => {
      const updated = [
        ...prev,
        { id, title: 'New Chat', timestamp: Date.now(), messages: [], projectId },
      ]
      localStorage.setItem(CHATS_KEY, JSON.stringify(updated))
      return updated
    })
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === projectId && !p.chatIds.includes(id)
          ? { ...p, chatIds: [...p.chatIds, id] }
          : p,
      )
      persistProjects(updated)
      return updated
    })

    updateMessages([])
    setInput('')
    setActiveChatId(id)
    idRef.current = 0
    setSidebarOpen(false)
  }

  const handleLoadChat = (chatId) => {
    invalidatePendingRequest()
    if (messagesRef.current.length > 0 && chatId !== activeChatId) {
      persistChat(messagesRef.current, activeChatId)
    }
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      updateMessages(chat.messages)
      setActiveChatId(chatId)
      idRef.current = Math.max(0, ...chat.messages.map((m) => m.id))
    }
    setSidebarOpen(false)
  }

  const handleClearHistory = () => {
    if (!window.confirm('Delete all saved chats? This cannot be undone.')) return
    invalidatePendingRequest()
    setChats([])
    updateMessages([])
    setInput('')
    setActiveChatId(null)
    idRef.current = 0
    localStorage.removeItem(CHATS_KEY)
  }

  const handleOpenProjects = () => {
    setSidebarView('projects')
    setSelectedProjectId(null)
    setAssignMenuFor(null)
  }

  const handleBackToProjects = () => {
    setSelectedProjectId(null)
  }

  const handleBackToChats = () => {
    setSidebarView('chats')
  }

  const handleCreateProject = () => {
    const name = newProjectName.trim()
    if (!name) return
    const project = { id: crypto.randomUUID(), name, chatIds: [] }
    setProjects((prev) => {
      const updated = [...prev, project]
      persistProjects(updated)
      return updated
    })
    setNewProjectName('')
  }

  const toggleChatInProject = (chatId, projectId) => {
    const project = projects.find((p) => p.id === projectId)
    const willAssign = project ? !project.chatIds.includes(chatId) : false
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== projectId) return p
        const assigned = p.chatIds.includes(chatId)
        return {
          ...p,
          chatIds: assigned
            ? p.chatIds.filter((c) => c !== chatId)
            : [...p.chatIds, chatId],
        }
      })
      persistProjects(updated)
      return updated
    })
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId ? { ...c, projectId: willAssign ? projectId : null } : c,
      )
      localStorage.setItem(CHATS_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const getProjectById = (projectId) => projects.find((p) => p.id === projectId)
  const getChatById = (chatId) => chats.find((c) => c.id === chatId)

  const selectedProject = getProjectById(selectedProjectId)
  const projectChats = selectedProject
    ? selectedProject.chatIds.map(getChatById).filter(Boolean)
    : []

  return (
    <div className="app-layout">
      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        &#9776;
      </button>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {assignMenuFor && (
        <div className="menu-backdrop" onClick={() => setAssignMenuFor(null)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo-icon">&#9728;</span>
          <h1 className="logo-text">Sun Chat Bot</h1>
        </div>

        {sidebarView === 'chats' && (
          <>
            <div className="sidebar-actions">
              <button className="new-chat-btn" onClick={handleNewChat}>
                + New Chat
              </button>
              <button className="projects-btn" onClick={handleOpenProjects}>
                Projects
              </button>
            </div>

            <div className="history-list">
              {chats.length === 0 ? (
                <p className="history-empty">No saved chats yet</p>
              ) : (
                [...chats].reverse().map((chat) => {
                const project = chat.projectId ? getProjectById(chat.projectId) : null
                return (
                  <div
                    key={chat.id}
                    className={`history-item${chat.id === activeChatId ? ' active' : ''}`}
                  >
                    <button
                      className="history-item-load"
                      onClick={() => handleLoadChat(chat.id)}
                    >
                      <span className="history-item-title">{chat.title}</span>
                      {project && (
                        <span className="history-item-project">{project.name}</span>
                      )}
                      <span className="history-item-time">
                        {formatTime(chat.timestamp)}
                      </span>
                    </button>
                    <button
                      className="history-item-assign"
                      aria-label="Add to project"
                      onClick={() =>
                        setAssignMenuFor(assignMenuFor === chat.id ? null : chat.id)
                      }
                    >
                      +
                    </button>
                    {assignMenuFor === chat.id && (
                      <div className="assign-menu">
                        {projects.length === 0 ? (
                          <span className="assign-empty">No projects yet</span>
                        ) : (
                          projects.map((p) => (
                            <button
                              key={p.id}
                              className="assign-option"
                              onClick={() => toggleChatInProject(chat.id, p.id)}
                            >
                              <span className="assign-check">
                                {p.chatIds.includes(chat.id) ? '✓' : ''}
                              </span>
                              {p.name}
                            </button>
                          ))
                        )}
                        <button
                          className="assign-option"
                          onClick={() => {
                            setAssignMenuFor(null)
                            handleOpenProjects()
                          }}
                        >
                          + Create project
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            </div>

            {chats.length > 0 && (
              <button className="clear-history-btn" onClick={handleClearHistory}>
                Clear History
              </button>
            )}
          </>
        )}

        {sidebarView === 'projects' && !selectedProjectId && (
          <>
            <button className="back-btn" onClick={handleBackToChats}>
              &larr; Back to Chats
            </button>

            <div className="create-project-bar">
              <input
                type="text"
                className="create-project-input"
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject()
                }}
              />
              <button className="create-project-btn" onClick={handleCreateProject}>
                Create
              </button>
            </div>

            <div className="project-list">
              {projects.length === 0 ? (
                <p className="project-empty">No projects yet</p>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    className="project-item"
                    onClick={() => setSelectedProjectId(p.id)}
                  >
                    <span className="project-item-name">{p.name}</span>
                    <span className="project-item-count">
                      {p.chatIds.length} chats
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {sidebarView === 'projects' && selectedProject && (
          <>
            <button className="back-btn" onClick={handleBackToProjects}>
              &larr; All Projects
            </button>

            <h3 className="project-detail-header">{selectedProject.name}</h3>

            <button
              className="new-chat-btn project-new-chat-btn"
              onClick={() => handleNewProjectChat(selectedProject.id)}
            >
              + New Chat in Project
            </button>

            <div className="project-chat-list">
              {projectChats.length === 0 ? (
                <p className="project-empty">
                  No chats yet. Use &ldquo;+ New Chat&rdquo; to start one in this
                  project, or &ldquo;+&rdquo; on a history item to add an existing chat.
                </p>
              ) : (
                [...projectChats]
                  .reverse()
                  .map((chat) => (
                    <button
                      key={chat.id}
                      className="project-chat-item"
                      onClick={() => handleLoadChat(chat.id)}
                    >
                      <span className="history-item-title">{chat.title}</span>
                      <span className="history-item-time">
                        {formatTime(chat.timestamp)}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </>
        )}
      </aside>

      <main className="chat-area">
        <div className="chat-window">
          <Clock theme={timeOfDay} />
          {showLocationBanner && !location && !locationDenied && (
            <div className="location-banner" role="region" aria-label="Location permission">
              <span className="location-banner-text">
                📍 Sun Chat Bot would like your location to answer location/weather-based
                questions.
              </span>
              <span className="location-banner-actions">
                <button
                  className="location-banner-btn"
                  onClick={() => {
                    setShowLocationBanner(false)
                    requestLocation()
                  }}
                >
                  Allow
                </button>
                <button
                  className="location-banner-btn muted"
                  onClick={() => setShowLocationBanner(false)}
                >
                  Not now
                </button>
              </span>
            </div>
          )}
          <div className="location-bar">
            {location?.place ? (
              <span className="location-chip">
                <span className="location-pin">📍</span>
                <span className="location-name">{location.place}</span>
                <button
                  className="location-action"
                  onClick={() => requestLocation(true)}
                  aria-label="Update location"
                  title="Update location"
                >
                  ↻
                </button>
              </span>
            ) : locationDenied ? (
              <span className="location-chip">
                <span className="location-pin">📍</span>
                <span className="location-name">Location off</span>
                <button
                  className="location-action"
                  onClick={() => requestLocation(false)}
                >
                  Enable
                </button>
              </span>
            ) : !showLocationBanner ? (
              <button
                className="location-chip location-share"
                onClick={() => requestLocation(false)}
              >
                <span className="location-pin">📍</span>
                <span className="location-name">Share location</span>
              </button>
            ) : null}
          </div>
          <div className="messages">
            {messages.length === 0 ? (
              <SkyScene theme={timeOfDay} />
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  {message.role === 'assistant' && (
                    <span className="message-label">Sun Chat Bot</span>
                  )}
                  {message.role === 'assistant' && message.contentType === 'image' ? (
                    <ImageMessage message={message} />
                  ) : message.role === 'assistant' ? (
                    <div className="bubble">
                      <Markdown content={message.content} />
                    </div>
                  ) : (
                    <div className="bubble">{message.content}</div>
                  )}
                </div>
              ))
            )}
            {isThinking && (
              <div className="message assistant">
                <span className="message-label">Sun Chat Bot</span>
                <SunLoader />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-bar">
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
            />
            <button className="send-btn" aria-label="Send" onClick={handleSend}>
              &#9654;
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App